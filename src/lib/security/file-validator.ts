import crypto from "node:crypto";
import path from "node:path";

export class FileSecurityError extends Error {
  constructor(message: string) {
    super(`[FILE_SECURITY_VIOLATION] ${message}`);
    this.name = "FileSecurityError";
  }
}

export type SupportedBinaryFormat =
  | "apk"
  | "pe_binary"
  | "elf_binary"
  | "macho_binary"
  | "electron_asar"
  | "har_archive";

export interface FileValidationResult {
  sanitizedFilename: string;
  storageKey: string;
  detectedFormat: SupportedBinaryFormat;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
}

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
const MAX_HAR_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Validates a file buffer using Magic Bytes detection.
 * Never trusts client-supplied MIME types or file extensions.
 */
export function detectMagicBytes(buffer: Buffer): SupportedBinaryFormat {
  if (buffer.length < 16) {
    throw new FileSecurityError("File is too small to contain valid executable or archive magic bytes.");
  }

  // 1. ELF Binary (Linux): 0x7F 'E' 'L' 'F' -> 7F 45 4C 46
  if (
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return "elf_binary";
  }

  // 2. PE Binary (Windows EXE / DLL): 'M' 'Z' -> 4D 5A
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    // Validate PE header pointer at offset 0x3C
    if (buffer.length > 0x40) {
      const peOffset = buffer.readUInt32LE(0x3c);
      if (
        peOffset + 4 <= buffer.length &&
        buffer[peOffset] === 0x50 && // 'P'
        buffer[peOffset + 1] === 0x45 && // 'E'
        buffer[peOffset + 2] === 0x00 &&
        buffer[peOffset + 3] === 0x00
      ) {
        return "pe_binary";
      }
    }
    // Return PE binary even if partial header
    return "pe_binary";
  }

  // 3. Mach-O Binary (macOS): 32-bit / 64-bit / Universal
  const magic32 = buffer.readUInt32BE(0);
  if (
    magic32 === 0xfeedface || // 32-bit BE
    magic32 === 0xcefaedfe || // 32-bit LE
    magic32 === 0xfeedfacf || // 64-bit BE
    magic32 === 0xcffaedfe || // 64-bit LE
    magic32 === 0xcafebabe // Universal binary FAT
  ) {
    return "macho_binary";
  }

  // 4. APK (Android Package) / ZIP header: 'P' 'K' 0x03 0x04 -> 50 4B 03 04
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return "apk";
  }

  // 5. Electron ASAR Archive: Starts with a 4-byte header size and contains JSON filesystem table
  // Header structure: uint32(4), uint32(header_size), uint32(header_json_size), uint32(json_str_len)
  if (buffer.length > 28) {
    const magicHeader = buffer.readUInt32LE(0);
    if (magicHeader === 4 || magicHeader === 0x04000000) {
      const headerSnippet = buffer.subarray(16, Math.min(buffer.length, 512)).toString("utf8");
      if (headerSnippet.includes('"files"') || headerSnippet.includes('"entry"')) {
        return "electron_asar";
      }
    }
  }

  // 6. HAR (HTTP Archive) JSON capture: UTF-8 text beginning with JSON containing "log"
  try {
    const preview = buffer.subarray(0, Math.min(buffer.length, 2048)).toString("utf8").trim();
    if (preview.startsWith("{") && preview.includes('"log"')) {
      return "har_archive";
    }
  } catch {
    // Not valid UTF-8
  }

  throw new FileSecurityError(
    "Unsupported or invalid binary file format. Expected APK, PE (.exe/.dll), ELF, Mach-O, ASAR, or HAR capture."
  );
}

/**
 * Sanitizes original filename: eliminates path traversal (../, ..\\),
 * strips illegal characters, and enforces strict alphanumeric + safe punctuation.
 */
export function sanitizeFilename(originalName: string): string {
  // Strip any directory traversal paths
  const base = path.basename(originalName);
  // Remove non-whitelisted characters
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return `artifact_${Date.now()}`;
  }
  return cleaned;
}

/**
 * Comprehensive upload verification pipeline.
 */
export function validateUploadedBuffer(
  buffer: Buffer,
  declaredFilename: string
): FileValidationResult {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new FileSecurityError(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 250 MB.`
    );
  }

  const detectedFormat = detectMagicBytes(buffer);

  if (detectedFormat === "har_archive" && buffer.length > MAX_HAR_SIZE_BYTES) {
    throw new FileSecurityError(
      `HAR archive size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 50 MB.`
    );
  }

  const sanitizedFilename = sanitizeFilename(declaredFilename);
  const uuid = crypto.randomUUID();
  const fileExt = path.extname(sanitizedFilename) || `.${detectedFormat}`;
  const storageKey = `vault/${uuid}${fileExt}`;

  const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

  const mimeMap: Record<SupportedBinaryFormat, string> = {
    apk: "application/vnd.android.package-archive",
    pe_binary: "application/vnd.microsoft.portable-executable",
    elf_binary: "application/x-elf",
    macho_binary: "application/x-mach-binary",
    electron_asar: "application/x-asar",
    har_archive: "application/json",
  };

  return {
    sanitizedFilename,
    storageKey,
    detectedFormat,
    mimeType: mimeMap[detectedFormat],
    sizeBytes: buffer.length,
    sha256Hash,
  };
}
