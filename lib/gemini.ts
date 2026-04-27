import "server-only";

import { env } from "@/lib/env";

type VisionResult = {
  meal_name_ar: string;
  ingredients_ar: string[];
  brief_assessment_ar: string;
};

function stripCodeFences(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function extractText(data: any) {
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

export async function analyzeMealImage(input: {
  mimeType: string;
  base64Data: string;
  note?: string;
}) {
  const prompt = [
    "حلل الصورة غذائياً وفقاً لمحتواها الظاهر فقط.",
    "استخرج اسم الوجبة وأقرب المكونات المرئية بصياغة عربية قصيرة ومباشرة.",
    "إذا كانت الصورة لمنتج معبأ فاذكر المنتج وأهم مكوناته المتوقعة من الصورة.",
    "أعد النتيجة بصيغة JSON فقط دون أي شرح إضافي.",
    'استخدم الشكل التالي حرفياً: {"meal_name_ar":"...","ingredients_ar":["..."],"brief_assessment_ar":"..."}',
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
          temperature: 0.2,
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
    brief_assessment_ar: parsed.brief_assessment_ar || "",
  };
}
