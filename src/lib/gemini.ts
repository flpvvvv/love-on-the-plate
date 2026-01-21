import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

/**
 * Custom error class for Gemini API errors with user-friendly messages
 */
export class GeminiError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly isRetryable: boolean;

  constructor(code: string, userMessage: string, isRetryable: boolean = false) {
    super(userMessage);
    this.name = 'GeminiError';
    this.code = code;
    this.userMessage = userMessage;
    this.isRetryable = isRetryable;
  }
}

/**
 * Parse Gemini API errors and return user-friendly error messages
 */
function parseGeminiError(error: unknown): GeminiError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Rate limit errors
  if (errorString.includes('429') || errorString.includes('rate limit') || errorString.includes('quota') || errorString.includes('resource exhausted')) {
    return new GeminiError(
      'RATE_LIMIT',
      'AI service is temporarily busy. Free tier limit reached. Please wait a moment and try again.',
      true
    );
  }

  // Invalid API key
  if (errorString.includes('401') || errorString.includes('api key') || errorString.includes('unauthorized') || errorString.includes('invalid_api_key')) {
    return new GeminiError(
      'AUTH_ERROR',
      'AI service authentication failed. Please contact support.',
      false
    );
  }

  // Content safety / blocked
  if (errorString.includes('blocked') || errorString.includes('safety') || errorString.includes('harm')) {
    return new GeminiError(
      'CONTENT_BLOCKED',
      'Image could not be analyzed. Please try a different photo.',
      false
    );
  }

  // Model unavailable
  if (errorString.includes('503') || errorString.includes('unavailable') || errorString.includes('overloaded')) {
    return new GeminiError(
      'SERVICE_UNAVAILABLE',
      'AI service is temporarily unavailable. Please try again later.',
      true
    );
  }

  // Request too large
  if (errorString.includes('413') || errorString.includes('too large') || errorString.includes('payload')) {
    return new GeminiError(
      'PAYLOAD_TOO_LARGE',
      'Image is too large to process. Please try a smaller image.',
      false
    );
  }

  // Timeout
  if (errorString.includes('timeout') || errorString.includes('deadline')) {
    return new GeminiError(
      'TIMEOUT',
      'AI service took too long to respond. Please try again.',
      true
    );
  }

  // Network errors
  if (errorString.includes('network') || errorString.includes('econnrefused') || errorString.includes('fetch')) {
    return new GeminiError(
      'NETWORK_ERROR',
      'Network connection issue. Please check your internet and try again.',
      true
    );
  }

  // Generic/unknown error
  return new GeminiError(
    'UNKNOWN_ERROR',
    'Failed to generate description. Please try again.',
    true
  );
}

const DESCRIPTION_PROMPT = `You are a warm and romantic food writer for "Love on the Plate" - a personal food diary celebrating homemade meals.

Analyze this food photo and provide:
1. The dish name in Chinese (Simplified) - be specific and concise (e.g., "红烧肉", "番茄炒蛋")
2. A brief, heartfelt description in English (2-3 sentences)
3. A brief, heartfelt description in Chinese (Simplified) (2-3 sentences)

Guidelines for descriptions:
- Focus on colors, textures, and what the dish appears to be
- Use warm, inviting language that evokes the love put into cooking
- Keep it concise but evocative
- Don't start with "This" or "这" - vary your sentence openings
- Avoid generic phrases like "looks delicious" or "看起来很好吃" - be specific

Example dish name: "香煎三文鱼配柠檬黄油酱"

Example English:
"Golden-crusted lasagna layers peek through bubbling mozzarella, each stratum promising a symphony of rich bolognese and silky béchamel. A labor of love that fills the kitchen with warmth."

Example Chinese:
"金黄酥脆的千层面在冒泡的马苏里拉奶酪下若隐若现，每一层都蕴含着浓郁肉酱与丝滑白酱的美妙交响。这是一道充满爱意的料理，温暖了整个厨房。"

IMPORTANT: Return your response in this exact JSON format (no markdown, no code blocks):
{"dishName": "菜名", "en": "English description here", "cn": "Chinese description here"}`;

export interface BilingualDescription {
  dishName: string;
  en: string;
  cn: string;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

export async function generateDescription(imageBase64: string): Promise<BilingualDescription> {
  // Validate input
  if (!imageBase64 || imageBase64.length === 0) {
    throw new GeminiError('INVALID_INPUT', 'No image data provided.', false);
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent([
      DESCRIPTION_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    let text = response.text().trim();

    // Handle empty response
    if (!text) {
      throw new GeminiError('EMPTY_RESPONSE', 'AI returned an empty response. Please try again.', true);
    }

    try {
      // Remove markdown code blocks if present (LLM sometimes wraps JSON in ```json ... ```)
      if (text.startsWith('```')) {
        // Extract content between code blocks
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          text = match[1].trim();
        }
      }

      // Parse the JSON response
      const parsed = JSON.parse(text);
      return {
        dishName: parsed.dishName || '',
        en: parsed.en || '',
        cn: parsed.cn || '',
      };
    } catch {
      // Fallback: if parsing fails, use the text as English description
      return {
        dishName: '',
        en: text,
        cn: '',
      };
    }
  } catch (error) {
    // If it's already a GeminiError, rethrow it
    if (error instanceof GeminiError) {
      throw error;
    }

    // Parse and convert to GeminiError
    throw parseGeminiError(error);
  }
}
