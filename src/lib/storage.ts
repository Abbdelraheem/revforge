import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const endpoint = env.STORAGE_ENDPOINT;
const region = env.STORAGE_REGION;
const accessKeyId = env.STORAGE_ACCESS_KEY;
const secretAccessKey = env.STORAGE_SECRET_KEY;
const bucket = env.STORAGE_BUCKET_DELIVERIES;

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
