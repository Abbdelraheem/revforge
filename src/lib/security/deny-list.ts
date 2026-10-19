import net from "node:net";
import { isBlockedIp } from "./safe-fetch";

// Hardcoded base denylist for government/military TLDs, internal, onion, and banking patterns
const DENIED_TLDS = [
  ".gov",
  ".mil",
  ".gov.uk",
  ".mil.uk",
  ".onion",
  ".internal",
  ".local",
  ".corp",
];

const DENIED_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
  "login.microsoftonline.com",
  "accounts.google.com",
  "chase.com",
  "bankofamerica.com",
  "wellsfargo.com",
  "paypal.com",
];

export interface DenyCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks a target URL against government, military, localhost, onion, and sensitive login domains
 */
export function checkTargetDenyList(rawUrl: string): DenyCheckResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "malformed_url" };
  }

  const hostname = url.hostname.toLowerCase();

  // Check TLDs
  for (const tld of DENIED_TLDS) {
    if (hostname.endsWith(tld)) {
      return {
        allowed: false,
        reason: `Forbidden target domain category (${tld} is prohibited).`,
      };
    }
  }

  // Check host patterns
  for (const pattern of DENIED_HOST_PATTERNS) {
    if (hostname === pattern || hostname.endsWith(`.${pattern}`)) {
      return {
        allowed: false,
        reason: `Target host '${hostname}' is prohibited on the platform deny-list.`,
      };
    }
  }

  // Check IP ranges only if hostname is directly an IP literal
  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    return {
      allowed: false,
      reason: `Target points to a private, non-unicast, or metadata IP address.`,
    };
  }

  return { allowed: true };
}
