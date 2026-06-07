import { describe, expect, it, vi } from "vitest"
import { extractTakenAt } from "./client-exif"

// Mock exifr
vi.mock("exifr", () => ({
  parse: vi.fn(),
}))

import * as exifr from "exifr"

describe("extractTakenAt", () => {
  it("returns ISO string when valid DateTimeOriginal is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeOriginal: "2024:12:25 14:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
    const parsed = new Date(result!)
    expect(parsed.getUTCFullYear()).toBe(2024)
    expect(parsed.getUTCMonth()).toBe(11) // December
    expect(parsed.getUTCDate()).toBe(25)
    expect(exifr.parse).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        pick: expect.arrayContaining(["DateTimeOriginal"]),
      })
    )
  })

  it("falls back to CreateDate when DateTimeOriginal is missing", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ CreateDate: "2024:12:25 14:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
    const parsed = new Date(result!)
    expect(parsed.getUTCFullYear()).toBe(2024)
  })

  it("falls back to ModifyDate when no other date is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ ModifyDate: "2024:12:25 14:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
  })

  it("prefers DateTimeOriginal over other date tags", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: "2024:12:25 14:30:00",
      CreateDate: "2023:01:01 00:00:00",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
    const parsed = new Date(result!)
    expect(parsed.getUTCFullYear()).toBe(2024)
  })

  it("returns null when no EXIF data is found", async () => {
    vi.mocked(exifr.parse).mockResolvedValue(undefined)

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).toBeNull()
  })

  it("returns null when all date tags are invalid strings", async () => {
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

  it("handles DateTimeDigitized tag", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeDigitized: "2024:06:15 10:00:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
    const parsed = new Date(result!)
    expect(parsed.getUTCFullYear()).toBe(2024)
    expect(parsed.getUTCMonth()).toBe(5) // June
  })

  it("handles DateTime tag as last resort", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ DateTime: "2024:03:10 08:30:00" })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
  })

  it("skips non-string tag values", async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: 12345,
      DateTime: "2024:03:10 08:30:00",
    })

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" })
    const result = await extractTakenAt(file)

    expect(result).not.toBeNull()
    const parsed = new Date(result!)
    expect(parsed.getUTCFullYear()).toBe(2024)
  })
})
