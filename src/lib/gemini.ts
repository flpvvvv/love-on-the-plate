import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

/**
 * Ingredients that should never appear in main ingredient lists.
 * These are either liquids, garnishes, or decorative elements that are not primary components.
 */
const NON_ESSENTIAL_INGREDIENTS = new Set([
  "水",
  "清水",
  "开水",
  "凉水",
  "温水",
  "热水",
])

function filterEssentialIngredients(ingredients: string[]): string[] {
  return ingredients.filter((i) => !NON_ESSENTIAL_INGREDIENTS.has(i))
}

/**
 * Custom error class for Gemini API errors with user-friendly messages
 */
export class GeminiError extends Error {
  public readonly code: string
  public readonly userMessage: string
  public readonly isRetryable: boolean

  constructor(code: string, userMessage: string, isRetryable: boolean = false) {
    super(userMessage)
    this.name = "GeminiError"
    this.code = code
    this.userMessage = userMessage
    this.isRetryable = isRetryable
  }
}

/**
 * Parse Gemini API errors and return user-friendly error messages
 */
function parseGeminiError(error: unknown): GeminiError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorString = errorMessage.toLowerCase()

  // Rate limit errors
  if (
    errorString.includes("429") ||
    errorString.includes("rate limit") ||
    errorString.includes("quota") ||
    errorString.includes("resource exhausted")
  ) {
    return new GeminiError(
      "RATE_LIMIT",
      "AI service is temporarily busy. Free tier limit reached. Please wait a moment and try again.",
      true
    )
  }

  // Invalid API key
  if (
    errorString.includes("401") ||
    errorString.includes("api key") ||
    errorString.includes("unauthorized") ||
    errorString.includes("invalid_api_key")
  ) {
    return new GeminiError(
      "AUTH_ERROR",
      "AI service authentication failed. Please contact support.",
      false
    )
  }

  // Content safety / blocked
  if (
    errorString.includes("blocked") ||
    errorString.includes("safety") ||
    errorString.includes("harm")
  ) {
    return new GeminiError(
      "CONTENT_BLOCKED",
      "Image could not be analyzed. Please try a different photo.",
      false
    )
  }

  // Model unavailable
  if (
    errorString.includes("503") ||
    errorString.includes("unavailable") ||
    errorString.includes("overloaded")
  ) {
    return new GeminiError(
      "SERVICE_UNAVAILABLE",
      "AI service is temporarily unavailable. Please try again later.",
      true
    )
  }

  // Request too large
  if (
    errorString.includes("413") ||
    errorString.includes("too large") ||
    errorString.includes("payload")
  ) {
    return new GeminiError(
      "PAYLOAD_TOO_LARGE",
      "Image is too large to process. Please try a smaller image.",
      false
    )
  }

  // Timeout
  if (errorString.includes("timeout") || errorString.includes("deadline")) {
    return new GeminiError(
      "TIMEOUT",
      "AI service took too long to respond. Please try again.",
      true
    )
  }

  // Network errors
  if (
    errorString.includes("network") ||
    errorString.includes("econnrefused") ||
    errorString.includes("fetch")
  ) {
    return new GeminiError(
      "NETWORK_ERROR",
      "Network connection issue. Please check your internet and try again.",
      true
    )
  }

  // Generic/unknown error
  return new GeminiError("UNKNOWN_ERROR", "Failed to generate description. Please try again.", true)
}

const DESCRIPTION_PROMPT_BASE = `You are a warm and romantic food writer for "Love on the Plate" - a personal food diary celebrating homemade meals.

Analyze this food photo and provide:
1. The dish name in Chinese (Simplified) - be specific and concise (e.g., "红烧肉", "番茄炒蛋")
2. A brief, heartfelt description in English (2-3 sentences)
3. A brief, heartfelt description in Chinese (Simplified) (2-3 sentences)
4. An array of 3-5 main ingredients in Chinese (Simplified). Focus only on the primary ingredients visible or likely used. Use common, standard Chinese ingredient names (e.g., "牛肉", "土豆", "胡萝卜", "芹菜", "香菇") — not cooking techniques or seasonings. Be consistent with naming: prefer broader terms ("猪肉") over overly specific ones ("猪五花肉片") unless the specificity is essential. Do NOT include water or other liquids, garnishes (e.g., scallions, cilantro, sesame seeds), or aromatics used only for flavoring.`

const INGREDIENTS_CONSISTENCY_GUIDE = `\n\nIf the following existing ingredient tags from the app apply, use the EXACT same text. Only invent new ingredient names if none of these match:
{existingIngredients}`

function buildDescriptionPrompt(existingIngredients: string[]): string {
  let prompt = DESCRIPTION_PROMPT_BASE
  if (existingIngredients.length > 0) {
    prompt += INGREDIENTS_CONSISTENCY_GUIDE.replace(
      "{existingIngredients}",
      existingIngredients.join(", ")
    )
  }
  prompt += `

Guidelines for descriptions:
- Focus on colors, textures, and what the dish appears to be
- Use warm, inviting language that evokes the love put into cooking
- Keep it concise but evocative
- Don't start with "This" or "这" - vary your sentence openings
- Avoid generic phrases like "looks delicious" or "看起来很好吃" - be specific

Example dish name: "香煎三文鱼配柠檬黄油酱"
Example ingredients: ["三文鱼", "柠檬", "黄油", "芦笋"]

Example English:
"Golden-crusted lasagna layers peek through bubbling mozzarella, each stratum promising a symphony of rich bolognese and silky béchamel. A labor of love that fills the kitchen with warmth."

Example Chinese:
"金黄酥脆的千层面在冒泡的马苏里拉奶酪下若隐若现，每一层都蕴含着浓郁肉酱与丝滑白酱的美妙交响。这是一道充满爱意的料理，温暖了整个厨房。"

IMPORTANT: Return your response in this exact JSON format (no markdown, no code blocks):
{"dishName": "菜名", "en": "English description here", "cn": "Chinese description here", "ingredients": ["牛肉", "土豆", "胡萝卜"]}`
  return prompt
}

/**
 * Build a prompt variant that keeps the user-provided dish name and only
 * regenerates the bilingual descriptions + ingredients based on the image + dish name.
 */
function buildDescriptionOnlyPrompt(dishName: string, existingIngredients: string[]): string {
  let ingredientsGuide = ""
  if (existingIngredients.length > 0) {
    ingredientsGuide = `\nIf the following existing ingredient tags from the app apply, use the EXACT same text. Only invent new ingredient names if none of these match:\n${existingIngredients.join(", ")}`
  }

  return `You are a warm and romantic food writer for "Love on the Plate" - a personal food diary celebrating homemade meals.

The dish in this photo is called "${dishName}". Do NOT change or suggest a different dish name.

Based on the image and this dish name, provide:
1. A brief, heartfelt description in English (2-3 sentences)
2. A brief, heartfelt description in Chinese (Simplified) (2-3 sentences)
3. An array of 3-5 main ingredients in Chinese (Simplified). Focus only on the primary ingredients visible or likely used in "${dishName}". Use common, standard Chinese ingredient names (e.g., "牛肉", "土豆", "胡萝卜", "芹菜", "香菇") — not cooking techniques or seasonings. Be consistent with naming: prefer broader terms ("猪肉") over overly specific ones ("猪五花肉片") unless the specificity is essential. Do NOT include water or other liquids, garnishes (e.g., scallions, cilantro, sesame seeds), or aromatics used only for flavoring.${ingredientsGuide}

Guidelines for descriptions:
- Focus on colors, textures, and what the dish appears to be
- Use warm, inviting language that evokes the love put into cooking
- Keep it concise but evocative
- Don't start with "This" or "这" - vary your sentence openings
- Avoid generic phrases like "looks delicious" or "看起来很好吃" - be specific
- Reference the specific dish name "${dishName}" naturally in your descriptions

Example English:
"Golden-crusted lasagna layers peek through bubbling mozzarella, each stratum promising a symphony of rich bolognese and silky béchamel. A labor of love that fills the kitchen with warmth."

Example Chinese:
"金黄酥脆的千层面在冒泡的马苏里拉奶酪下若隐若现，每一层都蕴含着浓郁肉酱与丝滑白酱的美妙交响。这是一道充满爱意的料理，温暖了整个厨房。"

IMPORTANT: Return your response in this exact JSON format (no markdown, no code blocks):
{"dishName": "${dishName}", "en": "English description here", "cn": "Chinese description here", "ingredients": ["牛肉", "土豆", "胡萝卜"]}`
}

export interface BilingualDescription {
  dishName: string
  en: string
  cn: string
  ingredients: string[]
}

const DEFAULT_MODEL = "gemini-3.1-flash-lite"

export async function generateDescription(
  imageBase64: string,
  dishNameHint?: string,
  existingIngredients?: string[]
): Promise<BilingualDescription> {
  // Validate input
  if (!imageBase64 || imageBase64.length === 0) {
    throw new GeminiError("INVALID_INPUT", "No image data provided.", false)
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const model = genAI.getGenerativeModel({ model: modelName })

  const knownIngredients = existingIngredients ?? []

  // Use the dish-name-aware prompt when a hint is provided
  const prompt = dishNameHint
    ? buildDescriptionOnlyPrompt(dishNameHint, knownIngredients)
    : buildDescriptionPrompt(knownIngredients)

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ])

    const response = await result.response
    let text = response.text().trim()

    // Handle empty response
    if (!text) {
      throw new GeminiError(
        "EMPTY_RESPONSE",
        "AI returned an empty response. Please try again.",
        true
      )
    }

    try {
      // Remove markdown code blocks if present (LLM sometimes wraps JSON in ```json ... ```)
      if (text.startsWith("```")) {
        // Extract content between code blocks
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) {
          text = match[1].trim()
        }
      }

      // Parse the JSON response
      const parsed = JSON.parse(text)
      const ingredients = filterEssentialIngredients(
        Array.isArray(parsed.ingredients)
          ? parsed.ingredients
              .filter((i: unknown): i is string => typeof i === "string" && i.trim().length > 0)
              .map((i: string) => i.trim())
          : []
      )
      return {
        // If a dish name hint was provided, always use it (don't let LLM override)
        dishName: dishNameHint || parsed.dishName || "",
        en: parsed.en || "",
        cn: parsed.cn || "",
        ingredients,
      }
    } catch {
      // Fallback: if parsing fails, use the text as English description
      return {
        dishName: "",
        en: text,
        cn: "",
        ingredients: [],
      }
    }
  } catch (error) {
    // If it's already a GeminiError, rethrow it
    if (error instanceof GeminiError) {
      throw error
    }

    // Parse and convert to GeminiError
    throw parseGeminiError(error)
  }
}

const INGREDIENTS_ONLY_PROMPT = `You are analyzing a food photo for "Love on the Plate".

The dish in this photo is called "{dishName}".

List 3-5 main ingredients used in this dish, in Chinese (Simplified). Focus only on the primary ingredients visible or likely used. Use common, standard Chinese ingredient names (e.g., "牛肉", "土豆", "胡萝卜", "芹菜", "香菇") — not cooking techniques or seasonings. Be consistent with naming: prefer broader terms ("猪肉") over overly specific ones ("猪五花肉片") unless the specificity is essential. Do NOT include water or other liquids, garnishes (e.g., scallions, cilantro, sesame seeds), or aromatics used only for flavoring.

If the following existing ingredient tags from the app apply, use the EXACT same text. Only invent new ingredient names if none of these match:
{existingIngredients}

IMPORTANT: Return your response in this exact JSON format (no markdown, no code blocks):
{"ingredients": ["牛肉", "土豆", "胡萝卜"]}`

/**
 * Generate only ingredients for an existing photo that already has a dish name
 * and descriptions. Does NOT overwrite dish name or descriptions.
 */
export async function generateIngredients(
  imageBase64: string,
  dishName: string,
  existingIngredients?: string[]
): Promise<string[]> {
  if (!imageBase64 || imageBase64.length === 0) {
    throw new GeminiError("INVALID_INPUT", "No image data provided.", false)
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const model = genAI.getGenerativeModel({ model: modelName })

  const knownIngredients = existingIngredients ?? []
  const prompt = INGREDIENTS_ONLY_PROMPT.replace("{dishName}", dishName).replace(
    "{existingIngredients}",
    knownIngredients.length > 0 ? knownIngredients.join(", ") : "(none yet)"
  )

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ])

    const response = await result.response
    let text = response.text().trim()

    if (!text) {
      throw new GeminiError(
        "EMPTY_RESPONSE",
        "AI returned an empty response. Please try again.",
        true
      )
    }

    try {
      if (text.startsWith("```")) {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) {
          text = match[1].trim()
        }
      }

      const parsed = JSON.parse(text)
      return filterEssentialIngredients(
        Array.isArray(parsed.ingredients)
          ? parsed.ingredients
              .filter((i: unknown): i is string => typeof i === "string" && i.trim().length > 0)
              .map((i: string) => i.trim())
          : []
      )
    } catch {
      return []
    }
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error
    }
    throw parseGeminiError(error)
  }
}
