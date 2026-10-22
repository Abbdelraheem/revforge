export const BRAND = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "RevForge",
  tagline: "Autonomous Clean-Room Reverse Engineering & Architecture Reconstruction",
  supportEmail: "support@revforge.ai",
  legalEmail: "legal@revforge.ai",
  privacyEmail: "privacy@revforge.ai",
  abuseEmail: "abuse@revforge.ai",
  domain: process.env.NEXT_PUBLIC_APP_DOMAIN || "revforge.ai",
  companyLegalName: "RevForge",
  location: "Dover, Delaware, USA",
} as const;

export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
