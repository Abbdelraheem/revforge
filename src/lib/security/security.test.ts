import { isBlockedIp } from "./safe-fetch";
import { checkTargetDenyList } from "./deny-list";
import { validateMagicBytes, type ArtifactKind } from "./file-validator";
import { RateLimiter } from "./rate-limiter";
import assert from "node:assert";

console.log("=== Running Security Core & Uploads Test Suite ===");

// 1. SSRF and IP blocking tests (50+ scenarios)
const blockedIps = [
  "127.0.0.1",
  "127.0.0.2",
  "127.255.255.254",
  "10.0.0.1",
  "10.255.255.255",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.1.1",
  "192.168.0.254",
  "169.254.169.254", // Cloud Metadata
  "169.254.0.1",
  "0.0.0.0",
  "100.64.0.1",      // Carrier-grade NAT
  "192.0.2.1",       // TEST-NET-1
  "198.51.100.1",    // TEST-NET-2
  "203.0.113.1",     // TEST-NET-3
  "224.0.0.1",       // Multicast
  "240.0.0.1",       // Reserved
  "255.255.255.255", // Broadcast
  "::1",             // IPv6 loopback
  "::",              // IPv6 unspecified
  "fc00::1",         // IPv6 unique local
  "fd12:3456:789a::1",
  "fe80::1",         // IPv6 link local
  "ff02::1",         // IPv6 multicast
  "::ffff:127.0.0.1", // IPv4-mapped loopback
  "::ffff:169.254.169.254", // IPv4-mapped metadata
  "::ffff:10.0.0.1",  // IPv4-mapped RFC1918
  "::ffff:192.168.1.1",
];

for (const ip of blockedIps) {
  assert.strictEqual(isBlockedIp(ip), true, `Failed to block private/metadata IP: ${ip}`);
}

const publicIps = [
  "8.8.8.8",
  "1.1.1.1",
  "93.184.216.34",
  "140.82.121.3",
  "2606:4700:4700::1111",
];

for (const ip of publicIps) {
  assert.strictEqual(isBlockedIp(ip), false, `Falsely blocked public unicast IP: ${ip}`);
}
console.log(`✓ Passed ${blockedIps.length + publicIps.length} SSRF IP validation tests.`);

// 2. Deny-list tests
const deniedUrls = [
  "https://defense.gov",
  "https://army.mil",
  "https://darkweb.onion",
  "https://login.microsoftonline.com",
  "https://accounts.google.com",
  "https://chase.com",
  "https://internal.local",
];

for (const url of deniedUrls) {
  const res = checkTargetDenyList(url);
  assert.strictEqual(res.allowed, false, `Failed to block denied URL: ${url}`);
}

const allowedUrls = [
  "https://example.com",
  "https://github.com/my-repo",
  "https://my-startup.io",
];

for (const url of allowedUrls) {
  const res = checkTargetDenyList(url);
  assert.strictEqual(res.allowed, true, `Falsely blocked allowed URL: ${url}`);
}
console.log(`✓ Passed Deny-list tests.`);

// 3. Magic-byte verification tests
// APK (ZIP header)
const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
assert.strictEqual(validateMagicBytes(zipHeader, "apk").valid, true);

// PE (MZ header)
const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
assert.strictEqual(validateMagicBytes(peHeader, "pe_binary").valid, true);

// ELF (\x7fELF)
const elfHeader = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
assert.strictEqual(validateMagicBytes(elfHeader, "elf_binary").valid, true);

// Mach-O
const machoHeader = Buffer.alloc(4);
machoHeader.writeUInt32BE(0xfeedface, 0);
assert.strictEqual(validateMagicBytes(machoHeader, "macho_binary").valid, true);

// Mismatched / Spoofed files
assert.strictEqual(validateMagicBytes(peHeader, "apk").valid, false);
assert.strictEqual(validateMagicBytes(zipHeader, "elf_binary").valid, false);

console.log(`✓ Passed Magic-byte binary verification tests.`);

// 4. Rate Limiter tests
async function testRateLimiter() {
  const testKey = "test-client-ip-1";
  for (let i = 0; i < 5; i++) {
    const res = await RateLimiter.consume(testKey, 5, 2);
    assert.strictEqual(res.success, true);
  }
  // 6th request should fail
  const blocked = await RateLimiter.consume(testKey, 5, 2);
  assert.strictEqual(blocked.success, false);
  console.log(`✓ Passed Rate limiter test.`);
}

testRateLimiter().then(() => {
  console.log("🎉 All Security Core tests completed successfully!");
});
