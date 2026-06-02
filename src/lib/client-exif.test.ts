import { describe, expect, it, vi } from "vitest"
import { extractTakenAt } from "./client-exif"

// Mock exifr
vi.mock("exifr", () => ({
  parse: vi.fn(),
}))

import * as exifr from "exifr"

describe("extractTakenAt", () => {
  it("returns ISO string when valid DateTimeOriginal is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue("2024:12:25 14:30:00")

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    // Result should be a valid non-null ISO string (timezone varies, so check components)
    expect(result).not.toBeNull()
    const parsed = new Date(result!)
    expect(parsed.getUTCFullYear()).toBe(2024)
    expect(parsed.getUTCMonth()).toBe(11) // December
    expect(parsed.getUTCDate()).toBe(25)
    expect(exifr.parse).toHaveBeenCalledWith(file, ["DateTimeOriginal"])
  })

  it("returns null when DateTimeOriginal is missing", async () => {
    vi.mocked(exifr.parse).mockResolvedValue(undefined)

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when DateTimeOriginal is an invalid date string", async () => {
    vi.mocked(exifr.parse).mockResolvedValue("not-a-date")

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when year is before 1990", async () => {
    vi.mocked(exifr.parse).mockResolvedValue("1980:01:01 00:00:00")

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when exifr throws an error", async () => {
    vi.mocked(exifr.parse).mockRejectedValue(new Error("EXIF parse failed"))

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null for HEIC files without EXIF", async () => {
    vi.mocked(exifr.parse).mockResolvedValue(undefined)

    const file = new File(["dummy"], "photo.heic", { type: "image/heic" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })
})
