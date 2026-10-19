import dns from "node:dns/promises";
import net from "node:net";
import https from "node:https";
import ipaddr from "ipaddr.js";

export class SSRFSecurityError extends Error {
  constructor(message: string) {
    super(`[SSRF_VIOLATION] ${message}`);
    this.name = "SSRFSecurityError";
  }
}

/**
 * Validates whether an IP address is private, loopback, link-local, multicast,
 * cloud metadata, or reserved using ipaddr.js.
 */
export function isBlockedIp(ip: string): boolean {
  try {
    let addr = ipaddr.parse(ip);
    if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }
    // loopback, private, linkLocal, multicast, reserved, uniqueLocal, carrierGradeNat, etc. => blocked
    return addr.range() !== "unicast";
  } catch {
    return true; // invalid IP syntax blocked by default
  }
}

/**
 * Resolves a hostname and verifies that ALL resolved IP addresses are public unicast.
 */
export async function resolveValidated(hostname: string): Promise<Array<{ address: string; family: number }>> {
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new SSRFSecurityError(`blocked_ip: ${hostname}`);
    return [{ address: hostname, family: net.isIPv6(hostname) ? 6 : 4 }];
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records || records.length === 0) throw new SSRFSecurityError(`dns_empty: ${hostname}`);
  for (const r of records) {
    if (isBlockedIp(r.address)) throw new SSRFSecurityError(`blocked_ip: ${r.address} for ${hostname}`);
  }
  return records;
}

export interface SafeFetchOptions {
  maxBytes: number;
  timeoutMs: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
  finalUrl: string;
}

/**
 * Implements Appendix B SSRF-Safe Fetch:
 * - HTTPS only
 * - DNS resolved with IP-pinning connection (prevent TOCTOU & DNS rebinding)
 * - Every redirect hop re-validated
 * - Max redirects checked
 * - Body byte cap and timeout enforced
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions
): Promise<SafeFetchResponse> {
  let url = new URL(rawUrl);
  const maxHops = options.maxRedirects ?? 5;

  for (let hop = 0; hop <= maxHops; hop++) {
    if (url.protocol !== "https:") {
      throw new SSRFSecurityError("https_only");
    }
    if (url.username || url.password) {
      throw new SSRFSecurityError("credentials_forbidden");
    }
    if (url.port && !["443"].includes(url.port)) {
      throw new SSRFSecurityError("port_forbidden");
    }

    const ips = await resolveValidated(url.hostname);
    const pinned = ips[0]!;

    const result = await new Promise<SafeFetchResponse>((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: "GET",
          headers: options.headers,
          timeout: options.timeoutMs,
          // IP-pinning: custom lookup bypasses DNS resolver and uses validated pinned IP directly
          lookup: (_hostname, _opts, cb) => {
            cb(null, pinned.address, pinned.family);
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0;

          // Handle redirects manually to re-validate every hop
          if ([301, 302, 303, 307, 308].includes(statusCode)) {
            const loc = res.headers["location"];
            res.resume(); // discard body
            if (!loc || typeof loc !== "string") {
              return reject(new SSRFSecurityError("bad_redirect"));
            }
            try {
              url = new URL(loc, url);
              return resolve({ status: statusCode, headers: res.headers, body: Buffer.alloc(0), finalUrl: url.href });
            } catch {
              return reject(new SSRFSecurityError("malformed_redirect_url"));
            }
          }

          const chunks: Buffer[] = [];
          let totalBytes = 0;

          res.on("data", (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > options.maxBytes) {
              res.destroy();
              return reject(new SSRFSecurityError("too_large"));
            }
            chunks.push(chunk);
          });

          res.on("end", () => {
            resolve({
              status: statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks),
              finalUrl: url.href,
            });
          });

          res.on("error", reject);
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new SSRFSecurityError("request_timeout"));
      });

      req.on("error", reject);
      req.end();
    });

    // If redirected, the loop continues and validates the new host
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      continue;
    }

    return result;
  }

  throw new SSRFSecurityError("too_many_redirects");
}
