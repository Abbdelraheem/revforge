import crypto from "node:crypto";
import { env } from "@/env";

export interface StoredArtifactMetadata {
  storageKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  uploadedAt: Date;
  expiresAt: Date;
}

// In-memory artifact metadata registry (backed by R2/S3 in production)
const artifactRegistry = new Map<string, StoredArtifactMetadata>();

/**
 * Stores uploaded binary buffer securely into the ephemeral vault.
 */
export async function storeArtifactInVault(
  projectId: string,
  sanitizedFilename: string,
  buffer: Buffer,
  mimeType: string
): Promise<StoredArtifactMetadata> {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const storageKey = `vault/${projectId}/${sanitizedFilename}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour auto purge

  const metadata: StoredArtifactMetadata = {
    storageKey,
    originalFilename: sanitizedFilename,
    sanitizedFilename,
    mimeType,
    sizeBytes: buffer.length,
    sha256Hash: hash,
    uploadedAt: now,
    expiresAt,
  };

  artifactRegistry.set(storageKey, metadata);
  return metadata;
}

/**
 * Generates a signed, time-limited download URL for a completed clean-room repository ZIP.
 */
export function generateSignedDownloadToken(projectId: string, expiresInSeconds: number = 72 * 3600): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${projectId}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(JSON.stringify({ projectId, expiresAt, signature })).toString("base64url");
}

/**
 * Verifies a signed download token.
 */
export function verifySignedDownloadToken(token: string): { valid: boolean; projectId?: string; error?: string } {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const { projectId, expiresAt, signature } = JSON.parse(raw);

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      return { valid: false, error: "Download link has expired per 72-hour zero-retention policy." };
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.NEXTAUTH_SECRET)
      .update(`${projectId}:${expiresAt}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))) {
      return { valid: false, error: "Invalid cryptographic signature." };
    }

    return { valid: true, projectId };
  } catch {
    return { valid: false, error: "Malformed download token." };
  }
}
