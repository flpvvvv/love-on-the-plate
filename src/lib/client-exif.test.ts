import { describe, expect, it, vi } from "vitest"
import { extractTakenAt } from "./client-exif"

// Mock exifr
vi.mock("exifr", () => ({
  parse: vi.fn(),
}))

import * as exifr from "exifr"

describe("extractTakenAt", () => {
  it("returns date-only string when valid DateTimeOriginal is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeOriginal: "2024:12:25 14:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-12-25")
    expect(exifr.parse).toHaveBeenCalledWith(file)
  })

  it("falls back to CreateDate when DateTimeOriginal is missing", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ CreateDate: "2024:12:25 14:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-12-25")
  })

  it("falls back to ModifyDate when no other date is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ ModifyDate: "2024:08:01 09:00:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-08-01")
  })

  it("prefers DateTimeOriginal over other date tags", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: "2024:12:25 14:30:00",
      CreateDate: "2023:01:01 00:00:00",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-12-25")
  })

  it("scans all string values when no priority tag matches", async () => {
    // Some cameras use non-standard tags
    vi.mocked(exifr.parse).mockResolvedValue({
      Make: "Canon",
      SomeCustomDate: "2024:06:15 10:30:00",
      Software: "Photoshop",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-06-15")
  })

  it("returns null when no EXIF data is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue(undefined)

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when EXIF contains no date-like strings", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      Make: "Apple",
      Orientation: 1,
      Software: "iOS 18",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when all date tags are invalid", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: "not-a-date",
      CreateDate: "also-invalid",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when year is before 1990", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeOriginal: "1980:01:01 00:00:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when year is after 2100", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeOriginal: "2101:01:01 00:00:00" })

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

  it("skips non-string tag values", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: 12345,
      OtherTag: "2024:03:10 08:30:00",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-03-10")
  })

  it("handles DateTimeDigitized tag", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeDigitized: "2024:06:15 10:00:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-06-15")
  })

  it("handles DateTime tag as last priority", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTime: "2024:03:10 08:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBe("2024-03-10")
  })

  it("returns empty EXIF object as null", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({})

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })
})
