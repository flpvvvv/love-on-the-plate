/**
 * Client-side EXIF extraction utility
 * Extracts DateTimeOriginal from a raw File object before compression
 * (canvas.toDataURL() strips all EXIF metadata)
 */
import * as exifr from "exifr"

const DATE_TAGS = [
  "DateTimeOriginal",
  "CreateDate",
  "DateTimeDigitized",
  "ModifyDate",
  "DateTime",
] as const

/**
 * Convert an EXIF date string ("YYYY:MM:DD HH:MM:SS") to ISO 8601.
 * Returns null if the date is invalid or out of range.
 */
function exifDateToISO(rawDate: string): string | null {
  const isoString = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3").replace(" ", "T")

  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return null

  const year = date.getFullYear()
  if (year < 1990 || year > 2100) return null

  return date.toISOString()
}

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
    // Parse with exifr — chunk-based reading avoids loading the entire file
    // Multiple date tags for compatibility: some cameras use CreateDate instead of DateTimeOriginal
    const exif: Record<string, unknown> | undefined = await exifr.parse(file, {
      pick: [...DATE_TAGS],
      // HEIC files can have large metadata boxes (depth maps, Live Photos, etc.)
      // that push EXIF deeper into the file. Read up to ~8MB to cover edge cases
      firstChunkSize: 256 * 1024, // 256KB initial chunk (browser)
      chunkSize: 256 * 1024, // 256KB per additional chunk
      chunkLimit: 30, // Up to 30 additional chunks (~8MB total)
    })

    if (!exif) {
      if (isDev) console.log("[exif] No EXIF data found in file")
      return null
    }

    // Try each date tag in priority order: DateTimeOriginal > CreateDate > DateTimeDigitized > ModifyDate > DateTime
    for (const tag of DATE_TAGS) {
      const rawDate = exif[tag]
      if (typeof rawDate !== "string") continue

      const iso = exifDateToISO(rawDate)
      if (iso) {
        if (isDev) console.log(`[exif] Success (${tag}):`, iso)
        return iso
      }
    }

    if (isDev) {
      const foundTags = Object.keys(exif).filter((k) => typeof exif[k] === "string")
      console.log("[exif] No valid date found. Tags present:", foundTags)
    }
    return null
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
