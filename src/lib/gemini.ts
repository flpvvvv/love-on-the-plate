import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

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
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const model = genAI.getGenerativeModel({ model: modelName });

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
}
