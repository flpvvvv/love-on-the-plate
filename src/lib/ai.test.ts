import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AIError, classifyHttpError, generateDescription } from "./ai"

describe("classifyHttpError", () => {
  it.each([
    [429, "RATE_LIMIT", true],
    [401, "AUTH_ERROR", false],
    [402, "AUTH_ERROR", false],
    [413, "PAYLOAD_TOO_LARGE", false],
    [400, "INVALID_REQUEST", false],
    [422, "INVALID_REQUEST", false],
    [500, "SERVICE_UNAVAILABLE", true],
    [503, "SERVICE_UNAVAILABLE", true],
  ])("maps status %i to %s (retryable: %s)", (status, code, isRetryable) => {
    const error = classifyHttpError(status, "")
    expect(error.code).toBe(code)
    expect(error.isRetryable).toBe(isRetryable)
    // The message is what the client shows the user, so it must never leak the raw body
    expect(error.userMessage).toBeTruthy()
    expect(error).toBeInstanceOf(AIError)
  })

  it("reports moderation blocks as non-retryable regardless of status", () => {
    const error = classifyHttpError(400, '{"error":{"message":"content flagged by moderation"}}')
    expect(error.code).toBe("CONTENT_BLOCKED")
    expect(error.isRetryable).toBe(false)
  })
})

describe("generateDescription", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = "test-key"
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  function respondWith(content: string) {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content } }] }),
    })
  }

  it("keeps the caller-provided dish name over the model's suggestion", async () => {
    respondWith(
      JSON.stringify({ dishName: "红烧肉", en: "Braised.", cn: "红烧。", ingredients: ["猪肉"] })
    )

    const result = await generateDescription("base64data", "妈妈的红烧肉")

    expect(result.dishName).toBe("妈妈的红烧肉")
    expect(result.en).toBe("Braised.")
    expect(result.ingredients).toEqual(["猪肉"])
  })

  it("drops non-essential ingredients and non-string entries", async () => {
    respondWith(
      JSON.stringify({
        dishName: "番茄炒蛋",
        en: "Eggs.",
        cn: "番茄。",
        ingredients: [" 番茄 ", "鸡蛋", "水", "清水", 42, ""],
      })
    )

    const { ingredients } = await generateDescription("base64data")

    expect(ingredients).toEqual(["番茄", "鸡蛋"])
  })

  it("surfaces provider failures as AIError", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => '{"error":{"message":"Rate limit reached"}}',
    })

    await expect(generateDescription("base64data")).rejects.toMatchObject({
      code: "RATE_LIMIT",
      isRetryable: true,
    })
  })
})
