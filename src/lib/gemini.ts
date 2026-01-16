import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const DESCRIPTION_PROMPT = `You are a warm and romantic food writer for "Love on the Plate" - a personal food diary celebrating homemade meals.

Analyze this food photo and write TWO brief, heartfelt descriptions (2-3 sentences each):
1. One in English
2. One in Chinese (Simplified)

Guidelines for BOTH descriptions:
- Focus on colors, textures, and what the dish appears to be
- Use warm, inviting language that evokes the love put into cooking
- Keep it concise but evocative
- Don't start with "This" or "这" - vary your sentence openings
- Avoid generic phrases like "looks delicious" or "看起来很好吃" - be specific
- If you can identify the dish, mention its name naturally

Example English:
"Golden-crusted lasagna layers peek through bubbling mozzarella, each stratum promising a symphony of rich bolognese and silky béchamel. A labor of love that fills the kitchen with warmth."

Example Chinese:
"金黄酥脆的千层面在冒泡的马苏里拉奶酪下若隐若现，每一层都蕴含着浓郁肉酱与丝滑白酱的美妙交响。这是一道充满爱意的料理，温暖了整个厨房。"

IMPORTANT: Return your response in this exact JSON format (no markdown, no code blocks):
{"en": "English description here", "cn": "Chinese description here"}`;

export interface BilingualDescription {
  en: string;
  cn: string;
}

export async function generateDescription(imageBase64: string): Promise<BilingualDescription> {
  // Use gemini-3-flash-preview for latest capabilities
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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
    const text = response.text().trim();

  try {
    // Parse the JSON response
    const parsed = JSON.parse(text);
    return {
      en: parsed.en || '',
      cn: parsed.cn || '',
    };
  } catch {
    // Fallback: if parsing fails, use the text as English description
    return {
      en: text,
      cn: '',
    };
  }
}
