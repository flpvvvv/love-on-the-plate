/**
 * Lightweight image utilities — no native modules.
 * Image processing (resize, thumbnail, rotation, JPEG conversion) is handled
 * on the client side via canvas, which avoids native dependency issues on Vercel.
 */

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Parse a JPEG buffer header to extract dimensions without a full decode.
 * Falls back to using Buffer size to estimate dimensions if header parsing fails.
 */
export function getDimensions(buffer: Buffer): ImageDimensions {
  return getJpegDimensions(buffer)
}

/**
 * Parse JPEG dimensions from file header (SOF0/SOF2 marker).
 * Scans for the Start of Frame marker which contains the dimensions.
 */
function getJpegDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 4) return { width: 0, height: 0 }

  // Check JPEG magic bytes
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { width: 0, height: 0 }
  }

  let i = 2
  while (i < buffer.length - 8) {
    // Look for marker: 0xFF followed by non-zero byte
    if (buffer[i] !== 0xff) {
      i++
      continue
    }

    const marker = buffer[i + 1]

    // SOF0 (Baseline), SOF2 (Progressive) contain dimensions
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (buffer[i + 5] << 8) | buffer[i + 6]
      const width = (buffer[i + 7] << 8) | buffer[i + 8]
      if (height > 0 && width > 0 && height < 65535 && width < 65535) {
        return { width, height }
      }
      return { width: 0, height: 0 }
    }

    // SOS marker (0xDA) — no more headers after this, dimensions not found
    if (marker === 0xda) break

    // Skip over this marker segment
    if (marker >= 0xd0 && marker <= 0xd9) {
      // Marker without length (RST, SOI, EOI, etc.)
      i += 2
    } else {
      // Marker with 2-byte length field
      if (i + 4 > buffer.length) break
      const length = (buffer[i + 2] << 8) | buffer[i + 3]
      i += 2 + length
    }
  }

  return { width: 0, height: 0 }
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64")
}
