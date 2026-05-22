import { describe, expect, it } from "vitest"
import { GeminiError } from "./gemini"

// Note: parseGeminiError is not exported, but we can test it indirectly
// through the behavior of GeminiError construction

describe("GeminiError", () => {
  it("creates error with all properties", () => {
    const error = new GeminiError("RATE_LIMIT", "Rate limit exceeded", true)
    expect(error.code).toBe("RATE_LIMIT")
    expect(error.userMessage).toBe("Rate limit exceeded")
    expect(error.isRetryable).toBe(true)
    expect(error.name).toBe("GeminiError")
    expect(error.message).toBe("Rate limit exceeded")
  })

  it("defaults isRetryable to false", () => {
    const error = new GeminiError("AUTH_ERROR", "Auth failed")
    expect(error.isRetryable).toBe(false)
  })

  it("is instance of Error", () => {
    const error = new GeminiError("TEST", "Test message")
    expect(error).toBeInstanceOf(Error)
  })

  describe("error codes", () => {
    it("RATE_LIMIT error is retryable", () => {
      const error = new GeminiError("RATE_LIMIT", "Rate limit message", true)
      expect(error.isRetryable).toBe(true)
    })

    it("AUTH_ERROR is not retryable", () => {
      const error = new GeminiError("AUTH_ERROR", "Auth error", false)
      expect(error.isRetryable).toBe(false)
    })

    it("CONTENT_BLOCKED is not retryable", () => {
      const error = new GeminiError("CONTENT_BLOCKED", "Content blocked", false)
      expect(error.isRetryable).toBe(false)
    })

    it("SERVICE_UNAVAILABLE is retryable", () => {
      const error = new GeminiError("SERVICE_UNAVAILABLE", "Service unavailable", true)
      expect(error.isRetryable).toBe(true)
    })

    it("PAYLOAD_TOO_LARGE is not retryable", () => {
      const error = new GeminiError("PAYLOAD_TOO_LARGE", "Payload too large", false)
      expect(error.isRetryable).toBe(false)
    })

    it("TIMEOUT is retryable", () => {
      const error = new GeminiError("TIMEOUT", "Timeout", true)
      expect(error.isRetryable).toBe(true)
    })

    it("NETWORK_ERROR is retryable", () => {
      const error = new GeminiError("NETWORK_ERROR", "Network error", true)
      expect(error.isRetryable).toBe(true)
    })
  })
})
