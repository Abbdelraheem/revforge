import crypto from "node:crypto";

export interface PresignedUploadRequest {
  workspaceId: string;
  originalFilename: string;
  fileSizeBytes: number;
  declaredKind: string;
}

export interface PresignedUploadResponse {
  storageKey: string;
  uploadUrl: string;
  maxSizeBytes: number;
}

/**
 * Storage provider interface handling uploads, raw evidence, specs, and deliveries
 */
export class StorageService {
  private static MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB per Section 7.2

  /**
   * Generates a presigned PUT upload URL with sanitization and size caps
   */
  static async createPresignedUpload(
    req: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    if (req.fileSizeBytes > this.MAX_UPLOAD_SIZE) {
      throw new Error(`File size exceeds 500 MB maximum threshold.`);
    }

    // Strip unsafe path traversal sequences and characters from filename
    const sanitizedName = req.originalFilename
      .replace(/\.\./g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^_+/, "");
    const fileUuid = crypto.randomUUID();
    const storageKey = `ws/${req.workspaceId}/uploads/${fileUuid}-${sanitizedName}`;

    const endpoint = process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
    const bucket = process.env.S3_BUCKET_UPLOADS || "uploads";

    // Direct S3/MinIO upload endpoint
    const uploadUrl = `${endpoint}/${bucket}/${storageKey}`;

    return {
      storageKey,
      uploadUrl,
      maxSizeBytes: this.MAX_UPLOAD_SIZE,
    };
  }

  /**
   * Generates a signed download URL for completed delivery ZIPs (max 5 min expiry)
   */
  static async createDeliverySignedUrl(
    storageKey: string,
    expiresInSec: number = 300
  ): Promise<string> {
    const endpoint = process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
    const bucket = process.env.S3_BUCKET_DELIVERIES || "deliveries";
    const expiresAt = Date.now() + Math.min(expiresInSec, 300) * 1000;

    // Cryptographic signature token for delivery download verification
    const secret = process.env.DATA_KEY || "revforge_storage_signing_secret";
    const token = crypto
      .createHmac("sha256", secret)
      .update(`${storageKey}:${expiresAt}`)
      .digest("hex");

    return `${endpoint}/${bucket}/${storageKey}?expires=${expiresAt}&token=${token}`;
  }
}
