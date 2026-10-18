import dns from "node:dns/promises";
import net from "node:net";

export class SSRFSecurityError extends Error {
  constructor(message: string) {
    super(`[SSRF_VIOLATION] ${message}`);
    this.name = "SSRFSecurityError";
  }
}

/**
 * Checks if an IPv4 address falls within a CIDR block.
 */
function isIPv4InCIDR(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  if (!range || !bitsStr) return false;
  const bits = parseInt(bitsStr, 10);

  const ipToInt = (addr: string): number => {
    return (
      addr
        .split(".")
        .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0) >>> 0
    );
  };

  const ipNum = ipToInt(ip);
  const rangeNum = ipToInt(range);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Validates whether an IP address is private, loopback, link-local, multicast,
 * cloud metadata, or reserved.
 */
export function isBlockedIP(ip: string): boolean {
  // If IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith("::ffff:")) {
    const v4 = ip.replace("::ffff:", "");
    if (net.isIPv4(v4)) {
      return isBlockedIP(v4);
    }
  }

  // IPv4 blocked ranges
  if (net.isIPv4(ip)) {
    const blockedV4CIDRs = [
      "0.0.0.0/8", // Current network
      "10.0.0.0/8", // RFC 1918 Private
      "100.64.0.0/10", // Carrier-Grade NAT
      "127.0.0.0/8", // Loopback
      "169.254.0.0/16", // Link-local / Cloud Metadata (169.254.169.254)
      "172.16.0.0/12", // RFC 1918 Private
      "192.0.0.0/24", // IETF Protocol Assignments
      "192.0.2.0/24", // TEST-NET-1
      "192.88.99.0/24", // 6to4 Relay
      "192.168.0.0/16", // RFC 1918 Private
      "198.18.0.0/15", // Benchmark testing
      "198.51.100.0/24", // TEST-NET-2
      "203.0.113.0/24", // TEST-NET-3
      "224.0.0.0/4", // Multicast
      "240.0.0.0/4", // Reserved
      "255.255.255.255/32", // Broadcast
    ];

    for (const cidr of blockedV4CIDRs) {
      if (isIPv4InCIDR(ip, cidr)) {
        return true;
      }
    }
    return false;
  }

  // IPv6 blocked ranges
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true; // Loopback & unspecified
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // Unique Local (fc00::/7)
    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true; // Link-local unicast (fe80::/10)
    }
    if (normalized.startsWith("ff")) return true; // Multicast (ff00::/8)
    if (normalized.startsWith("2001:db8")) return true; // Documentation
    return false;
  }

  // Invalid IP syntax is blocked by default
  return true;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * 1. Checks protocol (https: only, or http: only if explicitly allowed).
 * 2. Blocks user/password credentials in URL.
 * 3. Resolves DNS records before any request to detect DNS rebinding.
 * 4. Ensures all resolved IPs are non-private and non-cloud-metadata.
 */
export async function validateTargetUrl(
  rawUrl: string,
  options: { allowHttp?: boolean; allowedPorts?: number[] } = {}
): Promise<{ safeUrl: URL; resolvedIPs: string[] }> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SSRFSecurityError("Malformed URL string.");
  }

  // Allowed protocols
  const allowedProtocols = options.allowHttp ? ["https:", "http:"] : ["https:"];
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new SSRFSecurityError(`Forbidden protocol: '${parsed.protocol}'. Only HTTPS is permitted.`);
  }

  // Prevent embedded credentials (e.g. https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    throw new SSRFSecurityError("Credentials in URL are strictly prohibited.");
  }

  // Restrict ports
  const defaultPort = parsed.protocol === "https:" ? 443 : 80;
  const targetPort = parsed.port ? parseInt(parsed.port, 10) : defaultPort;
  const allowedPorts = options.allowedPorts || [80, 443];

  if (!allowedPorts.includes(targetPort)) {
    throw new SSRFSecurityError(`Port ${targetPort} is not in the allowed list.`);
  }

  const hostname = parsed.hostname;

  // Direct IP entered as hostname
  if (net.isIP(hostname)) {
    if (isBlockedIP(hostname)) {
      throw new SSRFSecurityError(`Direct access to private or metadata IP '${hostname}' is blocked.`);
    }
    return { safeUrl: parsed, resolvedIPs: [hostname] };
  }

  // Domain lookup with DNS resolution inspection
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      throw new SSRFSecurityError(`Failed to resolve hostname: '${hostname}'.`);
    }

    const resolvedIPs: string[] = [];

    for (const record of lookupResults) {
      resolvedIPs.push(record.address);
      if (isBlockedIP(record.address)) {
        throw new SSRFSecurityError(
          `Domain '${hostname}' resolves to blocked private/metadata IP '${record.address}'.`
        );
      }
    }

    return { safeUrl: parsed, resolvedIPs };
  } catch (error) {
    if (error instanceof SSRFSecurityError) throw error;
    throw new SSRFSecurityError(`DNS lookup failed for '${hostname}': ${(error as Error).message}`);
  }
}
