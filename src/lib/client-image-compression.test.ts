import { describe, expect, it } from "vitest"
import { base64ToBlob, formatFileSize, getBase64Size } from "./client-image-compression"

describe("base64ToBlob", () => {
  it("converts base64 string to blob", () => {
    const base64 = "SGVsbG8gV29ybGQ=" // "Hello World" in base64
    const blob = base64ToBlob(base64, "text/plain")
    expect(blob.type).toBe("text/plain")
    expect(blob.size).toBe(11)
  })

  it("uses default mime type when not specified", () => {
    const base64 = "abc123"
    const blob = base64ToBlob(base64)
    expect(blob.type).toBe("image/jpeg")
  })

  it("handles empty base64 string", () => {
    const blob = base64ToBlob("")
    expect(blob.size).toBe(0)
  })
})

describe("getBase64Size", () => {
  it("calculates correct size for base64 without padding", () => {
    // "Hello World" = 11 bytes, base64 "SGVsbG8gV29ybGQ=" has 16 chars + 1 padding
    const base64 = "SGVsbG8gV29ybGQ="
    expect(getBase64Size(base64)).toBe(11)
  })

  it("calculates correct size for base64 with padding", () => {
    // "Hi" = 2 bytes, base64 "SGk=" has 4 chars + 1 padding
    const base64 = "SGk="
    expect(getBase64Size(base64)).toBe(2)
  })

  it("calculates correct size for base64 with double padding", () => {
    // "A" = 1 byte, base64 "QQ==" has 4 chars + 2 padding
    const base64 = "QQ=="
    expect(getBase64Size(base64)).toBe(1)
  })

  it("handles empty string", () => {
    expect(getBase64Size("")).toBe(0)
  })
})

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B")
    expect(formatFileSize(0)).toBe("0 B")
  })

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
  })

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB")
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB")
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB")
  })
})
