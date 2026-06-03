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
 * Uses exifr for JPEG/HEIC/AVIF support, with verbose error logging
 * to help diagnose format-specific issues.
 *
 * @param file - The original photo File object
 * @returns ISO 8601 date string, or null if no valid EXIF date found
 */
export async function extractTakenAt(file: File): Promise<string | null> {
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development"

  if (isDev) {
    console.log(
      `[exif] Extracting from: ${file.name} (type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB)`
    )
  }

  try {
    // Parse with exifr — disable silentErrors so we can see what goes wrong
    const dateTimeOriginal: string | undefined = await exifr.parse(file, {
      pick: ["DateTimeOriginal"],
      // Increase chunk sizes for HEIC files which may have larger metadata boxes
      firstChunkSize: 256 * 1024, // 256KB initial chunk (browser)
      chunkSize: 128 * 1024, // 128KB per additional chunk
      chunkLimit: 10, // Up to 10 additional chunks (~1.5MB total)
    })

    if (!dateTimeOriginal) {
      if (isDev) console.log("[exif] No DateTimeOriginal found in file")
      return null
    }

    // EXIF DateTimeOriginal uses "YYYY:MM:DD HH:MM:SS" format,
    // convert to ISO 8601: "YYYY-MM-DDTHH:MM:SS"
    const isoString = dateTimeOriginal
      .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
      .replace(" ", "T")

    const date = new Date(isoString)

    // Sanity check: year must be between 1990 and 2100
    if (Number.isNaN(date.getTime())) {
      if (isDev) console.log("[exif] Invalid date parsed:", dateTimeOriginal)
      return null
    }
    const year = date.getFullYear()
    if (year < 1990 || year > 2100) {
      if (isDev) console.log("[exif] Date out of range:", dateTimeOriginal)
      return null
    }

    if (isDev) console.log("[exif] Success:", date.toISOString())
    return date.toISOString()
  } catch (err) {
    // Log the error for diagnostics — this helps identify format-specific issues
    console.error("[exif] Parse error:", err instanceof Error ? err.message : err, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
    return null
  }
}
