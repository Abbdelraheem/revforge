import { describe, it, expect } from "vitest";
import { assertSafeUrl } from "@/lib/security/ssrf";

describe("SSRF Validation Suite (assertSafeUrl)", () => {
  it("blocks cloud metadata hostnames and IPs", async () => {
    const metadataTargets = [
      "http://169.254.169.254/latest/meta-data/",
      "http://169.254.170.2/v2/credentials",
      "http://metadata.google.internal/computeMetadata/v1/",
      "http://instance-data/latest/meta-data/",
    ];

    for (const url of metadataTargets) {
      await expect(assertSafeUrl(url)).rejects.toThrow();
    }
  });

  it("blocks private RFC 1918 and loopback addresses", async () => {
    const privateTargets = [
      "http://127.0.0.1:8080/admin",
      "http://127.0.0.2:3000",
      "http://10.0.0.1/internal",
      "http://172.16.0.1/",
      "http://192.168.1.1/router",
      "http://[::1]/secret",
    ];

    for (const url of privateTargets) {
      await expect(assertSafeUrl(url)).rejects.toThrow();
    }
  });

  it("rejects non-HTTP protocols", async () => {
    const invalidProtocols = [
      "file:///etc/passwd",
      "gopher://127.0.0.1:70",
      "ftp://ftp.example.com",
      "javascript:alert(1)",
    ];

    for (const url of invalidProtocols) {
      await expect(assertSafeUrl(url)).rejects.toThrow();
    }
  });

  it("permits valid public HTTPS targets", async () => {
    const validPublicUrl = "https://github.com/torvalds/linux";
    const result = await assertSafeUrl(validPublicUrl);
    expect(result).toBe(validPublicUrl);
  });
});
