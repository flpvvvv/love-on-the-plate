/**
 * Client-side EXIF extraction utility
 * Extracts the capture date from a raw File object before compression
 * (canvas.toDataURL() strips all EXIF metadata)
 */
import * as exifr from "exifr"

/**
 * EXIF date format pattern: "YYYY:MM:DD HH:MM:SS"
 * Matches standard EXIF date strings.
 */
const EXIF_DATE_RE = /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/

/**
 * Priority order for known EXIF date tags.
 * DateTimeOriginal is the camera's capture time — the most accurate.
 * Fall through to other tags if the primary one is missing.
 */
const PRIORITY_TAGS = [
  "DateTimeOriginal",
  "CreateDate",
  "DateTimeDigitized",
  "ModifyDate",
  "DateTime",
]

/**
 * Convert a raw EXIF date string to a date-only "YYYY-MM-DD" string.
 * Returns null if the date is invalid or out of reasonable range.
 */
function toDateOnly(rawDate: string): string | null {
  // Replace EXIF colon-separated date with ISO dash format
  const iso = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  if (year < 1990 || year > 2100) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/**
 * Search all EXIF string values for date-like patterns.
 * Fallback when none of the standard priority tags contain a valid date.
 */
function findAnyDate(exif: Record<string, unknown>): string | null {
  for (const [_key, value] of Object.entries(exif)) {
    if (typeof value !== "string") continue
    if (!EXIF_DATE_RE.test(value)) continue
    const result = toDateOnly(value)
    if (result) return result
  }
  return null
}

/**
 * Extract the capture date from a photo file (date only, no time).
 * Must be called on the original File before any canvas-based compression.
 *
 * Strategy:
 * 1. Parse all EXIF data from the file (no tag filtering — exifr reads only
 *    the metadata portion, not the entire file)
 * 2. Check known date tags in priority order
 * 3. Fall back to searching all string values for date patterns
 *
 * @param file - The original photo File object
 * @returns "YYYY-MM-DD" string, or null if no valid date found
 */
export async function extractTakenAt(file: File): Promise<string | null> {
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development"

  if (isDev) {
    console.log(
      `[exif] Extracting from: ${file.name} (type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB)`
    )
  }

  try {
    // Parse all EXIF data at once — exifr only reads the metadata portion
    const exif = await exifr.parse(file)

    if (!exif || Object.keys(exif).length === 0) {
      if (isDev) console.log("[exif] No EXIF data found in file")
      return null
    }

    // 1. Check known priority tags
    for (const tag of PRIORITY_TAGS) {
      const raw = exif[tag]
      if (typeof raw !== "string") continue
      const result = toDateOnly(raw)
      if (result) {
        if (isDev) console.log(`[exif] Found via ${tag}:`, result)
        return result
      }
    }

    // 2. Fallback: search any string value for date patterns
    const anyDate = findAnyDate(exif)
    if (anyDate) {
      if (isDev) console.log("[exif] Found via full scan:", anyDate)
      return anyDate
    }

    if (isDev) {
      const stringKeys = Object.entries(exif)
        .filter(([, v]) => typeof v === "string")
        .map(([k]) => k)
      console.log("[exif] No valid date found. String tags:", stringKeys)
    }
    return null
  } catch (err) {
    console.error("[exif] Parse error:", err instanceof Error ? err.message : err, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
    return null
  }
}
