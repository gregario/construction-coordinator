// Minimal ZIP file builder using STORE (no compression) method.
// Produces a valid ZIP archive as a Uint8Array containing multiple text files.
// No external dependencies — uses the ZIP local file header + central directory format.

interface ZipEntry {
  name: string
  content: string
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function writeUint16LE(value: number): Uint8Array {
  const buf = new Uint8Array(2)
  buf[0] = value & 0xff
  buf[1] = (value >> 8) & 0xff
  return buf
}

function writeUint32LE(value: number): Uint8Array {
  const buf = new Uint8Array(4)
  buf[0] = value & 0xff
  buf[1] = (value >> 8) & 0xff
  buf[2] = (value >> 16) & 0xff
  buf[3] = (value >> 24) & 0xff
  return buf
}

/** CRC-32 computation (ISO 3309 / ITU-T V.42) */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0
  for (const arr of arrays) totalLength += arr.length
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * Build a ZIP archive from a list of named text file entries.
 * Uses STORE method (no compression) — adequate for small CSV bundles.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = []
  const centralHeaders: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = textToBytes(entry.name)
    const contentBytes = textToBytes(entry.content)
    const crc = crc32(contentBytes)
    const size = contentBytes.length

    // Local file header (30 bytes + name + content)
    const localHeader = concat(
      writeUint32LE(0x04034b50),   // Local file header signature
      writeUint16LE(20),           // Version needed (2.0)
      writeUint16LE(0),            // General purpose bit flag
      writeUint16LE(0),            // Compression method: STORE
      writeUint16LE(0),            // Last mod time
      writeUint16LE(0),            // Last mod date
      writeUint32LE(crc),          // CRC-32
      writeUint32LE(size),         // Compressed size
      writeUint32LE(size),         // Uncompressed size
      writeUint16LE(nameBytes.length), // File name length
      writeUint16LE(0),            // Extra field length
      nameBytes,
      contentBytes
    )
    localHeaders.push(localHeader)

    // Central directory header (46 bytes + name)
    const centralHeader = concat(
      writeUint32LE(0x02014b50),   // Central directory header signature
      writeUint16LE(20),           // Version made by
      writeUint16LE(20),           // Version needed
      writeUint16LE(0),            // General purpose bit flag
      writeUint16LE(0),            // Compression method: STORE
      writeUint16LE(0),            // Last mod time
      writeUint16LE(0),            // Last mod date
      writeUint32LE(crc),          // CRC-32
      writeUint32LE(size),         // Compressed size
      writeUint32LE(size),         // Uncompressed size
      writeUint16LE(nameBytes.length), // File name length
      writeUint16LE(0),            // Extra field length
      writeUint16LE(0),            // File comment length
      writeUint16LE(0),            // Disk number start
      writeUint16LE(0),            // Internal file attributes
      writeUint32LE(0),            // External file attributes
      writeUint32LE(offset),       // Relative offset of local header
      nameBytes
    )
    centralHeaders.push(centralHeader)

    offset += localHeader.length
  }

  const centralDirOffset = offset
  const centralDirData = concat(...centralHeaders)
  const centralDirSize = centralDirData.length

  // End of central directory record (22 bytes)
  const eocd = concat(
    writeUint32LE(0x06054b50),           // EOCD signature
    writeUint16LE(0),                     // Disk number
    writeUint16LE(0),                     // Disk with central directory
    writeUint16LE(entries.length),        // Entries on this disk
    writeUint16LE(entries.length),        // Total entries
    writeUint32LE(centralDirSize),        // Size of central directory
    writeUint32LE(centralDirOffset),      // Offset of central directory
    writeUint16LE(0)                      // Comment length
  )

  return concat(...localHeaders, centralDirData, eocd)
}
