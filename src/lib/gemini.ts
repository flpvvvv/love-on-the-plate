import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const DESCRIPTION_PROMPT = `You are a warm and romantic food writer for "Love on the Plate" - a personal food diary celebrating homemade meals.

Analyze this food photo and write a brief, heartfelt description (2-3 sentences max).

Guidelines:
- Focus on colors, textures, and what the dish appears to be
- Use warm, inviting language that evokes the love put into cooking
- Keep it concise but evocative
- Don't start with "This" - vary your sentence openings
- Avoid generic phrases like "looks delicious" - be specific
- If you can identify the dish, mention its name naturally

Example good descriptions:
- "Golden-crusted lasagna layers peek through bubbling mozzarella, each stratum promising a symphony of rich bolognese and silky béchamel. A labor of love that fills the kitchen with warmth."
- "Vibrant stir-fried vegetables glisten with a savory glaze, the bright orange carrots and verdant broccoli creating a colorful canvas. Simple ingredients transformed with care."

Write the description only, no additional commentary.`;

export async function generateDescription(imageBase64: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
  return response.text().trim();
}
