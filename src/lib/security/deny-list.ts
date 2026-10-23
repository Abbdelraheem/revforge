import net from "node:net";
import { isBlockedIp } from "./safe-fetch";

// Base denylist for government/military TLDs, internal, onion, and banking patterns
const DENIED_TLDS = [
  ".gov",
  ".mil",
  ".gov.uk",
  ".mil.uk",
  ".gov.au",
  ".mil.au",
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
  "binance.com",
  "coinbase.com",
  "kraken.com",
  "thepiratebay.org",
  "1337x.to",
  "rarbg.to",
];

// Sensitive category keywords matched against host and path
const SENSITIVE_CATEGORIES = [
  {
    category: "Financial Services & Banking",
    regex: /(bank|banking|creditunion|mortgage|wiretransfer|crypto|forex|brokerage|paydayloan)/i,
  },
  {
    category: "Healthcare & Patient Data (HIPAA)",
    regex: /(hospital|patient|healthrecord|medicalrecords|clinic|pharmacy|rxportal)/i,
  },
  {
    category: "Government & Military Operations",
    regex: /(pentagon|defense|military|intelligence|govagency|whitehouse)/i,
  },
  {
    category: "Malware, Spyware & Botnets",
    regex: /(keylogger|botnet|trojan|ransomware|c2server|stealer|rat-payload)/i,
  },
  {
    category: "DRM, Copy Protection & Anti-Cheat Bypass",
    regex: /(denuvo|battleye|easyanticheat|anticheat|drm-bypass|crack|keygen)/i,
  },
  {
    category: "Gambling & Sports Betting",
    regex: /(casino|betting|sportsbook|poker|lottery|slotmachine|gambling)/i,
  },
  {
    category: "Adult & Explicit Content",
    regex: /(porn|adult|xxx|erotic|escort|camgirl)/i,
  },
  {
    category: "Copyright Infringement & Piracy",
    regex: /(torrent|warez|pirated|cracked-software|movie-streaming-free)/i,
  },
];

export interface DenyCheckResult {
  allowed: boolean;
  category?: string;
  reason?: string;
}

/**
 * Checks a target URL against government, military, localhost, onion,
 * and sensitive industry/illicit category deny-lists.
 */
export function checkTargetDenyList(rawUrl: string): DenyCheckResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "malformed_url" };
  }

  const hostname = url.hostname.toLowerCase();
  const fullUrl = url.toString().toLowerCase();

  // 1. Check TLDs
  for (const tld of DENIED_TLDS) {
    if (hostname.endsWith(tld)) {
      return {
        allowed: false,
        category: "Government/Military/Restricted Infrastructure",
        reason: `Target prohibited under Section 4 (Acceptable Use Policy) of RevForge Terms: Prohibited TLD (${tld}).`,
      };
    }
  }

  // 2. Check Host Patterns
  for (const pattern of DENIED_HOST_PATTERNS) {
    if (hostname === pattern || hostname.endsWith(`.${pattern}`)) {
      return {
        allowed: false,
        category: "Prohibited Financial / Sensitive Service",
        reason: `Target host '${hostname}' is prohibited under Section 4 (Acceptable Use Policy) of RevForge Terms.`,
      };
    }
  }

  // 3. Check IP ranges if hostname is directly an IP literal
  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    return {
      allowed: false,
      category: "Private / Cloud Metadata Network",
      reason: `Target points to a private, non-unicast, or metadata IP address under Section 4 of RevForge Terms.`,
    };
  }

  // 4. Sensitive Category Keyword Matching
  for (const item of SENSITIVE_CATEGORIES) {
    if (item.regex.test(hostname) || item.regex.test(url.pathname)) {
      return {
        allowed: false,
        category: item.category,
        reason: `Quote refused under Section 4 (Acceptable Use Policy) of RevForge Terms: Target matched prohibited category '${item.category}'.`,
      };
    }
  }

  return { allowed: true };
}
