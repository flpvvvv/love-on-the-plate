/**
 * DeepSeek (OpenAI-compatible) client for the vision tasks behind "Love on the Plate":
 * photo -> dish name, bilingual descriptions, and ingredient tags.
 *
 * Requests go straight to the REST endpoint with `fetch`; the app needs exactly one
 * call shape, so no SDK dependency is warranted.
 */
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

const DEFAULT_MODEL = "deepseek-flash"

/**
 * Upper bound for one vision request. `/api/describe` caps the enclosing
 * invocation at 60s, so this must fail first.
 */
const REQUEST_TIMEOUT_MS = 50_000

/** Dish name + two short descriptions + up to five ingredients fits well inside this. */
const MAX_OUTPUT_TOKENS = 2000

/**
 * Ingredients that should never appear in main ingredient lists.
 * These are either liquids, garnishes, or decorative elements that are not primary components.
 */
const NON_ESSENTIAL_INGREDIENTS: Record<string, true> = {
  水: true,
  清水: true,
  开水: true,
  凉水: true,
  温水: true,
  热水: true,
}

/**
 * Custom error class for AI API errors with user-friendly messages
 */
export class AIError extends Error {
  public readonly code: string
  public readonly userMessage: string
  public readonly isRetryable: boolean

  constructor(code: string, userMessage: string, isRetryable: boolean = false) {
    super(userMessage)
    this.name = "AIError"
    this.code = code
    this.userMessage = userMessage
    this.isRetryable = isRetryable
  }
}

/**
 * Map a DeepSeek HTTP error response to a user-friendly AIError.
 * @see https://api-docs.deepseek.com/quick_start/error_codes
 */
export function classifyHttpError(status: number, body: string): AIError {
  const errorString = body.toLowerCase()

  // Content moderation (not part of the documented code list, but returned in-band)
  if (errorString.includes("flagged") || errorString.includes("moderation")) {
    return new AIError(
      "CONTENT_BLOCKED",
      "Image could not be analyzed. Please try a different photo.",
      false
    )
  }

  if (status === 429) {
    return new AIError(
      "RATE_LIMIT",
      "AI service is temporarily busy. Please wait a moment and try again.",
      true
    )
  }

  // 401 wrong API key, 402 out of balance — both need an operator, not a retry
  if (status === 401 || status === 402) {
    return new AIError(
      "AUTH_ERROR",
      "AI service authentication failed. Please contact support.",
      false
    )
  }

  if (status === 413) {
    return new AIError(
      "PAYLOAD_TOO_LARGE",
      "Image is too large to process. Please try a smaller image.",
      false
    )
  }

  // 500 server error, 503 overloaded
  if (status >= 500) {
    return new AIError(
      "SERVICE_UNAVAILABLE",
      "AI service is temporarily unavailable. Please try again later.",
      true
    )
  }

  // 400 invalid format, 422 invalid parameters
  return new AIError("INVALID_REQUEST", "Failed to generate description. Please try again.", false)
}

/**
 * Map a thrown transport failure (timeout, DNS, connection reset) to an AIError.
 */
function toTransportError(error: unknown): AIError {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.toLowerCase().includes("timeout"))
  ) {
    return new AIError("TIMEOUT", "AI service took too long to respond. Please try again.", true)
  }

  return new AIError(
    "NETWORK_ERROR",
    "Network connection issue. Please check your internet and try again.",
    true
  )
}

/**
 * Strip markdown code fences — models occasionally wrap JSON despite instructions.
 */
function stripCodeFences(text: string): string {
  if (!text.startsWith("```")) return text
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return match ? match[1].trim() : text
}

/**
 * Coerce the model's `ingredients` field into a clean list of non-empty strings.
 */
function normalizeIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
    .map((i) => i.trim())
    .filter((i) => !(i in NON_ESSENTIAL_INGREDIENTS))
}

/**
 * Send one prompt + image to DeepSeek and return the raw response text.
 * Callers own the prompt-specific parsing.
 */
async function requestCompletion(prompt: string, imageBase64: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new AIError("AUTH_ERROR", "AI service is not configured. Please contact support.", false)
  }

  const modelName = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL

  let response: Response
  try {
    response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        // Captioning needs no chain-of-thought; thinking is on by default and
        // would only add latency to the upload path.
        thinking: { type: "disabled" },
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw toTransportError(error)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    console.error(`DeepSeek error [${response.status}]:`, body.slice(0, 500))
    throw classifyHttpError(response.status, body)
  }

  let payload: { choices?: { message?: { content?: string } }[] }
  try {
    payload = await response.json()
  } catch {
    throw new AIError("EMPTY_RESPONSE", "AI returned an empty response. Please try again.", true)
  }

  const text = payload.choices?.[0]?.message?.content?.trim() ?? ""
  if (!text) {
    throw new AIError("EMPTY_RESPONSE", "AI returned an empty response. Please try again.", true)
  }

  return text
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

export async function generateDescription(
  imageBase64: string,
  dishNameHint?: string,
  existingIngredients?: string[]
): Promise<BilingualDescription> {
  // Validate input
  if (!imageBase64 || imageBase64.length === 0) {
    throw new AIError("INVALID_INPUT", "No image data provided.", false)
  }

  const knownIngredients = existingIngredients ?? []

  // Use the dish-name-aware prompt when a hint is provided
  const prompt = dishNameHint
    ? buildDescriptionOnlyPrompt(dishNameHint, knownIngredients)
    : buildDescriptionPrompt(knownIngredients)

  const rawText = await requestCompletion(prompt, imageBase64)
  const text = stripCodeFences(rawText)

  try {
    const parsed = JSON.parse(text)
    return {
      // If a dish name hint was provided, always use it (don't let the model override)
      dishName: dishNameHint || parsed.dishName || "",
      en: parsed.en || "",
      cn: parsed.cn || "",
      ingredients: normalizeIngredients(parsed.ingredients),
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
    throw new AIError("INVALID_INPUT", "No image data provided.", false)
  }

  const knownIngredients = existingIngredients ?? []
  const prompt = INGREDIENTS_ONLY_PROMPT.replace("{dishName}", dishName).replace(
    "{existingIngredients}",
    knownIngredients.length > 0 ? knownIngredients.join(", ") : "(none yet)"
  )

  const rawText = await requestCompletion(prompt, imageBase64)
  const text = stripCodeFences(rawText)

  try {
    return normalizeIngredients(JSON.parse(text).ingredients)
  } catch {
    return []
  }
}
