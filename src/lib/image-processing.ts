import sharp from "sharp"

interface ProcessedImage {
  fullBuffer: Buffer
  thumbBuffer: Buffer
  width: number
  height: number
  takenAt: Date | null
}

const MAX_FULL_SIZE = 1920 // Match client-side compression preset
const THUMB_SIZE = 400
const JPEG_QUALITY = 80

/**
 * Parse EXIF date format "YYYY:MM:DD HH:MM:SS" (colon-separated date)
 * Returns null if the format is invalid
 */
function parseExifDate(exifDate: string): Date | null {
  const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!match) return null
  const [, year, month, day, hour, min, sec] = match
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(min, 10),
    parseInt(sec, 10)
  )
}

/**
 * Extract DateTimeOriginal from raw EXIF buffer.
 * EXIF DateTimeOriginal (tag 0x9003) is stored as a 20-byte ASCII string.
 * We search for the pattern "YYYY:MM:DD HH:MM:SS" in the buffer.
 */
function extractDateTimeOriginalFromExif(exifBuffer: Buffer): Date | null {
  // Convert buffer to string and search for date pattern
  // The EXIF date format is "YYYY:MM:DD HH:MM:SS" (20 bytes)
  const exifStr = exifBuffer.toString("ascii")

  // Look for date patterns - DateTimeOriginal is typically first meaningful date
  // Pattern matches dates like "2024:05:22 18:30:45"
  const datePattern = /\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/g
  const matches = exifStr.match(datePattern)

  if (!matches || matches.length === 0) return null

  // Try each match - typically DateTimeOriginal is first, followed by other dates
  for (const match of matches) {
    const parsed = parseExifDate(match)
    if (parsed && parsed.getFullYear() >= 1990 && parsed.getFullYear() <= 2100) {
      // Sanity check: date should be reasonable (between 1990 and 2100)
      return parsed
    }
  }

  return null
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  // Get image metadata including EXIF
  const metadata = await sharp(buffer).metadata()

  // Extract EXIF DateTimeOriginal if available
  let takenAt: Date | null = null
  if (metadata.exif) {
    takenAt = extractDateTimeOriginalFromExif(metadata.exif)
  }

  // Calculate dimensions for full image (maintain aspect ratio)
  const originalWidth = metadata.width || MAX_FULL_SIZE
  const originalHeight = metadata.height || MAX_FULL_SIZE

  let fullWidth = originalWidth
  let fullHeight = originalHeight

  if (originalWidth > MAX_FULL_SIZE || originalHeight > MAX_FULL_SIZE) {
    if (originalWidth > originalHeight) {
      fullWidth = MAX_FULL_SIZE
      fullHeight = Math.round((originalHeight / originalWidth) * MAX_FULL_SIZE)
    } else {
      fullHeight = MAX_FULL_SIZE
      fullWidth = Math.round((originalWidth / originalHeight) * MAX_FULL_SIZE)
    }
  }

  // Process full image and thumbnail in parallel (independent pipelines)
  const [fullBuffer, thumbBuffer] = await Promise.all([
    sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(fullWidth, fullHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer(),
  ])

  return {
    fullBuffer,
    thumbBuffer,
    width: fullWidth,
    height: fullHeight,
    takenAt,
  }
}

/**
 * Extract DateTimeOriginal from an image buffer using sharp.
 * Used as a fallback when client-side EXIF extraction fails.
 * Sharp handles JPEG, HEIC, PNG, WebP, and other formats natively.
 */
export async function extractExifTakenAt(buffer: Buffer): Promise<Date | null> {
  try {
    const metadata = await sharp(buffer).metadata()
    if (metadata.exif) {
      return extractDateTimeOriginalFromExif(metadata.exif)
    }
  } catch {
    // Some formats (or corrupted files) might fail — that's ok
  }
  return null
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64")
}
