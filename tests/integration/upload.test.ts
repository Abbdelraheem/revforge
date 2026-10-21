import { describe, it, expect } from "vitest";
import { StorageService } from "@/lib/storage/service";

describe("Uploads & Storage Integration Suite", () => {
  it("enforces 500 MB maximum threshold on upload requests", async () => {
    const oversizeBytes = 550 * 1024 * 1024; // 550 MB
    await expect(
      StorageService.createPresignedUpload({
        workspaceId: "ws-123",
        originalFilename: "large-app.apk",
        fileSizeBytes: oversizeBytes,
        declaredKind: "apk",
      })
    ).rejects.toThrow("File size exceeds 500 MB maximum threshold.");
  });

  it("sanitizes filenames and generates unique storage keys", async () => {
    const res = await StorageService.createPresignedUpload({
      workspaceId: "ws-456",
      originalFilename: "../../etc/passwd.apk",
      fileSizeBytes: 10 * 1024 * 1024,
      declaredKind: "apk",
    });

    expect(res.storageKey).not.toContain("..");
    expect(res.uploadUrl).toBeDefined();
    expect(res.maxSizeBytes).toBe(500 * 1024 * 1024);
  });
});
