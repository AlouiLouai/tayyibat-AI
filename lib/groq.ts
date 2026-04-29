import "server-only";

import { env } from "@/lib/env";
import { stripCodeFences, type VisionResult } from "@/lib/gemini";

function extractGroqText(data: any) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq returned no text content");
  }

  return content.trim();
}

export async function analyzeMealImageWithGroq(input: {
  mimeType: string;
  base64Data: string;
  note?: string;
}) {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  if (!env.groqVisionModel) {
    throw new Error("GROQ_VISION_MODEL is missing");
  }

  const prompt = [
    "حدد اسم الوجبة أو المنتج من الصورة.",
    "استخرج المكونات الظاهرة أو الأوضح فقط، بحد أقصى 5 مكونات.",
    "إذا كانت الصورة لمنتج معبأ فاذكر اسم المنتج وأهم مكوناته المتوقعة من العبوة.",
    "لا تكتب شرحاً أو تقييماً أو أي نص خارج JSON.",
    '{"meal_name_ar":"...","ingredients_ar":["..."]}',
    input.note ? `ملاحظة المستخدم: ${input.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.groqVisionModel,
      temperature: 0,
      max_tokens: 160,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.base64Data}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Groq vision failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  const text = stripCodeFences(extractGroqText(data));
  const parsed = JSON.parse(text) as VisionResult;

  return {
    meal_name_ar: parsed.meal_name_ar || "وجبة غير محددة",
    ingredients_ar: Array.isArray(parsed.ingredients_ar)
      ? parsed.ingredients_ar.filter(Boolean)
      : [],
  };
}
