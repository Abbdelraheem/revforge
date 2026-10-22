import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const endpoint = process.env.STORAGE_ENDPOINT || env.STORAGE_ENDPOINT || "http://127.0.0.1:9000";
const region = process.env.STORAGE_REGION || env.STORAGE_REGION || "us-east-1";
const accessKeyId = process.env.STORAGE_ACCESS_KEY || env.STORAGE_ACCESS_KEY || "minioadmin";
const secretAccessKey = process.env.STORAGE_SECRET_KEY || env.STORAGE_SECRET_KEY || "minioadmin";
const bucket = process.env.STORAGE_BUCKET_DELIVERIES || env.STORAGE_BUCKET_DELIVERIES || "deliveries";

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Required for MinIO in local dev
});

export const storage = {
  async putObject(key: string, body: Buffer | Uint8Array, contentType = "application/zip"): Promise<void> {
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await s3Client.send(cmd);
  },

  async getSignedDownloadUrl(key: string, expiresInSec = 300): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return getSignedUrl(s3Client, cmd, { expiresIn: Math.min(expiresInSec, 300) });
  },
};
