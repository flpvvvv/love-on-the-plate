import { describe, expect, it } from "vitest"
import { isValidBase64Image, isValidUUID, sanitizeErrorMessage } from "./validation"

describe("isValidUUID", () => {
  it("returns true for valid UUID v4", () => {
    expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("returns false for invalid UUID format", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false)
    expect(isValidUUID("123e4567-e89b-12d3-a456")).toBe(false) // too short
    expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000-extra")).toBe(false) // too long
    expect(isValidUUID("123E4567-E89B-12D3-A456-426614174000")).toBe(true) // uppercase valid
  })

  it("returns false for non-string values", () => {
    expect(isValidUUID(null)).toBe(false)
    expect(isValidUUID(undefined)).toBe(false)
    expect(isValidUUID(123)).toBe(false)
    expect(isValidUUID({})).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isValidUUID("")).toBe(false)
  })
})

describe("isValidBase64Image", () => {
  it("returns true for valid base64 strings", () => {
    expect(isValidBase64Image("abc123")).toBe(true)
    expect(isValidBase64Image("a".repeat(100))).toBe(true)
  })

  it("returns false for strings exceeding max length", () => {
    const longString = "a".repeat(15_000_000)
    expect(isValidBase64Image(longString)).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isValidBase64Image(null)).toBe(false)
    expect(isValidBase64Image(undefined)).toBe(false)
    expect(isValidBase64Image(123)).toBe(false)
    expect(isValidBase64Image({})).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isValidBase64Image("")).toBe(false)
  })

  it("accepts strings at boundary limit", () => {
    const boundaryString = "a".repeat(14_000_000)
    expect(isValidBase64Image(boundaryString)).toBe(true)
  })
})

describe("sanitizeErrorMessage", () => {
  it("removes file paths from error messages", () => {
    const error = new Error("Failed to read /Users/flp/project/file.txt")
    expect(sanitizeErrorMessage(error)).toBe("Failed to read [path]")
  })

  it("removes multiple file paths", () => {
    const error = new Error("Error in /src/lib/utils.ts and /src/lib/validation.ts")
    expect(sanitizeErrorMessage(error)).toBe("Error in [path] and [path]")
  })

  it("handles errors without file paths", () => {
    const error = new Error("Something went wrong")
    expect(sanitizeErrorMessage(error)).toBe("Something went wrong")
  })

  it("handles non-Error values", () => {
    expect(sanitizeErrorMessage("string error")).toBe("An unexpected error occurred")
    expect(sanitizeErrorMessage(null)).toBe("An unexpected error occurred")
    expect(sanitizeErrorMessage(undefined)).toBe("An unexpected error occurred")
    expect(sanitizeErrorMessage({ message: "test" })).toBe("An unexpected error occurred")
  })
})
