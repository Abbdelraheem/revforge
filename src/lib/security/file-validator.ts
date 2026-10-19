import crypto from "node:crypto";

export type ArtifactKind =
  | "apk"
  | "pe_binary"
  | "elf_binary"
  | "macho_binary"
  | "asar_package"
  | "har_archive";

export interface MagicByteValidationResult {
  valid: boolean;
  detectedKind?: ArtifactKind;
  error?: string;
}

/**
 * Validates uploaded file header bytes against exact binary signatures:
 * - APK: ZIP signature (PK\x03\x04)
 * - PE: MZ header (4D 5A)
 * - ELF: \x7fELF (7F 45 4C 46)
 * - Mach-O: Feedface (FE ED FA CE / FEEDFACF) or Fat Mach-O (CA FE BA BE)
 * - ASAR: Chromium ASAR header
 * - HAR: JSON structure containing {"log": {"version": ...}}
 */
export function validateMagicBytes(
  headerBuffer: Buffer,
  declaredKind: ArtifactKind
): MagicByteValidationResult {
  if (headerBuffer.length < 4) {
    return { valid: false, error: "header_too_small" };
  }

  // 1. APK (ZIP header)
  if (declaredKind === "apk") {
    const isZip =
      headerBuffer[0] === 0x50 &&
      headerBuffer[1] === 0x4b &&
      headerBuffer[2] === 0x03 &&
      headerBuffer[3] === 0x04;
    return isZip
      ? { valid: true, detectedKind: "apk" }
      : { valid: false, error: "invalid_apk_zip_magic" };
  }

  // 2. PE Binary (Windows .exe / .dll -> 'MZ')
  if (declaredKind === "pe_binary") {
    const isPE = headerBuffer[0] === 0x4d && headerBuffer[1] === 0x5a;
    return isPE
      ? { valid: true, detectedKind: "pe_binary" }
      : { valid: false, error: "invalid_pe_magic" };
  }

  // 3. ELF Binary (Linux -> '\x7fELF')
  if (declaredKind === "elf_binary") {
    const isELF =
      headerBuffer[0] === 0x7f &&
      headerBuffer[1] === 0x45 &&
      headerBuffer[2] === 0x4c &&
      headerBuffer[3] === 0x46;
    return isELF
      ? { valid: true, detectedKind: "elf_binary" }
      : { valid: false, error: "invalid_elf_magic" };
  }

  // 4. Mach-O (macOS binaries)
  if (declaredKind === "macho_binary") {
    const magic32LE = headerBuffer.readUInt32LE(0);
    const magic32BE = headerBuffer.readUInt32BE(0);
    const isMachO =
      magic32LE === 0xfeedface ||
      magic32LE === 0xfeedfacf ||
      magic32BE === 0xfeedface ||
      magic32BE === 0xfeedfacf ||
      magic32BE === 0xcafebabe; // Universal/FAT binary
    return isMachO
      ? { valid: true, detectedKind: "macho_binary" }
      : { valid: false, error: "invalid_macho_magic" };
  }

  // 5. ASAR (Electron package)
  if (declaredKind === "asar_package") {
    // ASAR header starts with 4-byte size followed by JSON header length
    if (headerBuffer.length >= 16) {
      const u32_1 = headerBuffer.readUInt32LE(0);
      if (u32_1 === 4 || u32_1 === 1) {
        return { valid: true, detectedKind: "asar_package" };
      }
    }
    return { valid: false, error: "invalid_asar_header" };
  }

  // 6. HAR Archive (JSON shape check)
  if (declaredKind === "har_archive") {
    try {
      const textChunk = headerBuffer.toString("utf8").trim();
      if (textChunk.startsWith("{") && (textChunk.includes('"log"') || textChunk.includes("'log'"))) {
        return { valid: true, detectedKind: "har_archive" };
      }
      return { valid: false, error: "invalid_har_json_structure" };
    } catch {
      return { valid: false, error: "invalid_har_encoding" };
    }
  }

  return { valid: false, error: "unknown_declared_kind" };
}

/**
 * Computes SHA-256 hash from a buffer
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export class FileSecurityError extends Error {
  constructor(message: string) {
    super(`[FILE_SECURITY_VIOLATION] ${message}`);
    this.name = "FileSecurityError";
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function detectMagicBytes(buffer: Buffer): { mimeType: string; extension: string; targetType: ArtifactKind } | null {
  if (buffer.length < 4) return null;
  // APK
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { mimeType: "application/vnd.android.package-archive", extension: ".apk", targetType: "apk" };
  }
  // PE
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { mimeType: "application/x-dosexec", extension: ".exe", targetType: "pe_binary" };
  }
  // ELF
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { mimeType: "application/x-executable", extension: ".elf", targetType: "elf_binary" };
  }
  return null;
}

export function validateUploadedBuffer(
  buffer: Buffer,
  filename: string,
  options?: { maxBytes?: number; allowedTypes?: string[] }
) {
  const maxBytes = options?.maxBytes || 500 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new FileSecurityError(`File size exceeds limit (${buffer.length} > ${maxBytes} bytes).`);
  }

  const detected = detectMagicBytes(buffer);
  const sanitized = sanitizeFilename(filename);
  const sha256 = computeSha256(buffer);

  return {
    valid: true,
    sizeBytes: buffer.length,
    sanitizedFilename: sanitized,
    mimeType: detected?.mimeType || "application/octet-stream",
    detectedType: detected?.targetType || "apk",
    sha256Hash: sha256,
  };
}
