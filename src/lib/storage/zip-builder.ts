/**
 * Minimal pure-Node.js ZIP archive generator (zero external dependencies).
 * Implements standard PKZip 2.0 format (uncompressed store mode).
 */

interface ZipEntry {
  filename: string;
  data: Buffer;
}

// CRC32 implementation
function calculateCrc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i]!;
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

export function buildZipArchive(entries: Array<{ path: string; content: string | Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirectoryEntries: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const data = typeof entry.content === "string" ? Buffer.from(entry.content, "utf8") : entry.content;
    const filenameBuf = Buffer.from(entry.path, "utf8");
    const crc32 = calculateCrc32(data);
    const size = data.length;

    // Local file header (30 bytes + filename length)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Min version to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(0, 8); // Compression method (0 = uncompressed store)
    localHeader.writeUInt16LE(0x5240, 10); // File time (arbitrary safe timestamp)
    localHeader.writeUInt16LE(0x5240, 12); // File date
    localHeader.writeUInt32LE(crc32, 14); // CRC-32
    localHeader.writeUInt32LE(size, 18); // Compressed size
    localHeader.writeUInt32LE(size, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, data);

    // Central directory header (46 bytes + filename length)
    const cdHeader = Buffer.alloc(46 + filenameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed to extract
    cdHeader.writeUInt16LE(0, 8); // General purpose bit flag
    cdHeader.writeUInt16LE(0, 10); // Compression method
    cdHeader.writeUInt16LE(0x5240, 12); // File time
    cdHeader.writeUInt16LE(0x5240, 14); // File date
    cdHeader.writeUInt32LE(crc32, 16); // CRC-32
    cdHeader.writeUInt32LE(size, 20); // Compressed size
    cdHeader.writeUInt32LE(size, 24); // Uncompressed size
    cdHeader.writeUInt16LE(filenameBuf.length, 28); // Filename length
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // File comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    filenameBuf.copy(cdHeader, 46);

    centralDirectoryEntries.push(cdHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectoryEntries.reduce((acc, b) => acc + b.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirectorySize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralDirectoryEntries, eocd]);
}
