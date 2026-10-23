import crypto from "node:crypto";
import { z } from "zod";
import { env } from "@/env";
import { storage } from "@/lib/storage";

export const AttestationPurposeSchema = z.enum([
  "interoperability",
  "security_audit",
  "data_recovery",
  "legacy_migration",
]);

export type AttestationPurpose = z.infer<typeof AttestationPurposeSchema>;

export const AttestationProofTypeSchema = z.enum([
  "dns_txt",
  "signed_letter",
  "domain_admin_email",
  "not_required",
]);

export const OwnershipAttestationSchema = z.object({
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  legalEntityName: z.string().min(2).max(200),
  registrationNumber: z.string().max(100).optional(),
  signatoryName: z.string().min(2).max(100),
  signatoryEmail: z.string().email(),
  signatoryTitle: z.string().min(2).max(100),
  purpose: AttestationPurposeSchema,
  buildCostCents: z.number().int().nonnegative(),
  proofType: AttestationProofTypeSchema,
  proofReference: z.string().max(500).optional(),
  clientIp: z.string().min(1),
  timestamp: z.string().datetime(),
  signature: z.string().optional(),
});

export type OwnershipAttestation = z.infer<typeof OwnershipAttestationSchema>;

const ATTESTATION_SECRET =
  process.env.ATTESTATION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "revforge_attestation_hmac_signing_key_32_characters_minimum";

export function computeAttestationSignature(data: Omit<OwnershipAttestation, "signature">): string {
  const payload = [
    data.projectId,
    data.workspaceId,
    data.legalEntityName,
    data.signatoryEmail,
    data.purpose,
    data.buildCostCents.toString(),
    data.proofType,
    data.proofReference || "",
    data.clientIp,
    data.timestamp,
  ].join(":");

  return crypto.createHmac("sha256", ATTESTATION_SECRET).update(payload).digest("hex");
}

/**
 * Validates attestation requirements.
 * For builds > $500 (50,000 cents), legal entity name, purpose, and proof are strictly required.
 */
export function validateAttestationRequirements(data: OwnershipAttestation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.buildCostCents > 50_000) {
    if (!data.legalEntityName || data.legalEntityName.trim().length < 3) {
      errors.push("Builds over $500 require a verified legal entity name.");
    }
    if (data.proofType === "not_required" || !data.proofReference) {
      errors.push(
        "Builds over $500 require affirmative uploaded proof (DNS TXT verification or signed authorization letter)."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Signs and archives an attestation bundle to S3 storage.
 */
export async function signAndArchiveAttestation(
  data: Omit<OwnershipAttestation, "signature">
): Promise<OwnershipAttestation> {
  const validation = validateAttestationRequirements(data as OwnershipAttestation);
  if (!validation.valid) {
    throw new Error(`Attestation validation failed: ${validation.errors.join("; ")}`);
  }

  const signature = computeAttestationSignature(data);
  const bundle: OwnershipAttestation = {
    ...data,
    signature,
  };

  const storageKey = `attestations/${data.projectId}.json`;
  const buffer = Buffer.from(JSON.stringify(bundle, null, 2), "utf8");

  await storage.putObject(
    storageKey,
    buffer,
    "application/json"
  );

  return bundle;
}

/**
 * Verifies the cryptographic integrity of an archived attestation bundle.
 */
export function verifyAttestationSignature(bundle: OwnershipAttestation): boolean {
  if (!bundle.signature) return false;
  const { signature, ...rest } = bundle;
  const expectedSignature = computeAttestationSignature(rest);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}
