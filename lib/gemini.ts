import "server-only";

import { env } from "@/lib/env";

export type VisionResult = {
  meal_name_ar: string;
  ingredients_ar: string[];
};

export function stripCodeFences(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

export function extractText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error("Gemini returned no content parts");
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

export async function embedText(text: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768,
        content: {
          parts: [{ text }],
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Embedding failed with status ${response.status}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error("Unexpected embedding response from Gemini");
  }

  return values;
}

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) {
    return [];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: "models/gemini-embedding-001",
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 768,
          content: {
            parts: [{ text }],
          },
        })),
      }),
    }
  );

  if (!response.ok) {
    return Promise.all(texts.map((text) => embedText(text)));
  }

  const data = await response.json();
  const embeddings = data?.embeddings;

  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    return Promise.all(texts.map((text) => embedText(text)));
  }

  return embeddings.map((entry) => {
    const values = entry?.values;

    if (!Array.isArray(values) || values.length !== 768) {
      throw new Error("Unexpected batch embedding response from Gemini");
    }

    return values as number[];
  });
}

export async function analyzeMealImageWithGemini(input: {
  mimeType: string;
  base64Data: string;
  note?: string;
}) {
  const prompt = [
    "حدد اسم الوجبة أو المنتج من الصورة.",
    "استخرج المكونات الظاهرة أو الأوضح فقط، بحد أقصى 5 مكونات.",
    "إذا كانت الصورة لمنتج معبأ فاذكر اسم المنتج وأهم مكوناته المتوقعة من العبوة.",
    "لا تكتب شرحاً أو تقييماً أو أي نص خارج JSON.",
    'استخدم الشكل التالي حرفياً: {"meal_name_ar":"...","ingredients_ar":["..."]}',
    input.note ? `ملاحظة المستخدم: ${input.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 160,
          temperature: 0,
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.base64Data,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Vision analysis failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  const text = stripCodeFences(extractText(data));
  const parsed = JSON.parse(text) as VisionResult;

  return {
    meal_name_ar: parsed.meal_name_ar || "وجبة غير محددة",
    ingredients_ar: Array.isArray(parsed.ingredients_ar)
      ? parsed.ingredients_ar.filter(Boolean)
      : [],
  };
}

export const analyzeMealImage = analyzeMealImageWithGemini;
