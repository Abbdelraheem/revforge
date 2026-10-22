import dns from "node:dns/promises";
import net from "node:net";
import { isBlockedIp } from "./safe-fetch";

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "localhost",
  "local",
]);

/**
 * Validates that a user-supplied URL does not target loopback, private ranges (RFC 1918),
 * link-local (RFC 3927), IPv6 unique-local (fc00::/7), CGNAT (100.64.x), or cloud metadata endpoints.
 *
 * Sourced as a pure validation module: throws descriptive errors without silent rewrites.
 */
export async function assertSafeUrl(url: string): Promise<string> {
  if (!url || typeof url !== "string") {
    throw new Error("[SSRF] Invalid URL provided: URL must be a non-empty string.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[SSRF] Malformed URL: "${url}"`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`[SSRF] Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error(`[SSRF] Hostname "${hostname}" is a reserved local or cloud metadata endpoint.`);
  }

  // Check direct IP or resolve DNS
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error(`[SSRF] Host is a private, loopback, or cloud-metadata IP address: "${hostname}"`);
    }
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      if (!records || records.length === 0) {
        throw new Error(`[SSRF] DNS resolution returned no addresses for host "${hostname}"`);
      }
      for (const rec of records) {
        if (isBlockedIp(rec.address)) {
          throw new Error(
            `[SSRF] Host "${hostname}" resolved to blocked private or cloud IP address: "${rec.address}"`
          );
        }
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith("[SSRF]")) throw err;
      throw new Error(`[SSRF] Failed to resolve host "${hostname}": ${err.message}`);
    }
  }

  return url;
}
