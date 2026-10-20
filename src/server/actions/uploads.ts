"use server";

import { requireSession } from "@/lib/auth";
import { StorageService } from "@/lib/storage/service";
import { validateUploadedBuffer, sanitizeFilename } from "@/lib/security/file-validator";

export interface CreatePresignedUploadParams {
  filename: string;
  fileSizeBytes: number;
  declaredKind: string;
}

export async function createPresignedUploadAction(params: CreatePresignedUploadParams) {
  const session = await requireSession();
  const workspaceId = session.workspace.id;

  const sanitized = sanitizeFilename(params.filename);

  try {
    const result = await StorageService.createPresignedUpload({
      workspaceId,
      originalFilename: sanitized,
      fileSizeBytes: params.fileSizeBytes,
      declaredKind: params.declaredKind,
    });

    return {
      success: true,
      storageKey: result.storageKey,
      uploadUrl: result.uploadUrl,
      maxSizeBytes: result.maxSizeBytes,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to generate presigned upload URL." };
  }
}

export interface VerifyUploadedBufferParams {
  filename: string;
  bufferBase64: string;
  declaredKind: string;
}

export async function verifyUploadedBufferAction(params: VerifyUploadedBufferParams) {
  await requireSession();

  try {
    const buffer = Buffer.from(params.bufferBase64, "base64");
    const validation = validateUploadedBuffer(
      buffer,
      params.filename
    );

    return {
      success: true,
      detectedKind: validation.detectedType,
      sha256: validation.sha256Hash,
      sizeBytes: validation.sizeBytes,
    };
  } catch (err: any) {
    return { error: err.message || "File validation failed." };
  }
}
