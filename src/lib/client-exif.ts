/**
 * Client-side EXIF extraction utility
 * Extracts DateTimeOriginal from a raw File object before compression
 * (canvas.toDataURL() strips all EXIF metadata)
 */
import * as exifr from "exifr"

/**
 * Extract the DateTimeOriginal timestamp from a photo file.
 * Must be called on the original File before any canvas-based compression.
 *
 * @param file - The original photo File object
 * @returns ISO 8601 date string, or null if no valid EXIF date found
 */
export async function extractTakenAt(file: File): Promise<string | null> {
  try {
    const dateTimeOriginal: string | undefined = await exifr.parse(file, ["DateTimeOriginal"])

    if (!dateTimeOriginal) return null

    // EXIF DateTimeOriginal uses "YYYY:MM:DD HH:MM:SS" format,
    // convert to ISO 8601: "YYYY-MM-DDTHH:MM:SS"
    const isoString = dateTimeOriginal
      .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
      .replace(" ", "T")

    const date = new Date(isoString)

    // Sanity check: year must be between 1990 and 2100
    if (Number.isNaN(date.getTime())) return null
    const year = date.getFullYear()
    if (year < 1990 || year > 2100) return null

    return date.toISOString()
  } catch {
    // EXIF extraction is a nice-to-have, never block upload
    return null
  }
}
