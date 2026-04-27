import { NextResponse } from "next/server";

import { analyzeMealImage, embedText } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildMealAssessment, type MatchRow } from "@/lib/tayyibat";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const note = String(formData.get("note") || "").trim();

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "ملف الصورة مفقود." }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم. ارفع صورة فقط." }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const vision = await analyzeMealImage({
      mimeType: image.type || "image/jpeg",
      base64Data: buffer.toString("base64"),
      note,
    });

    const uniqueIngredients = Array.from(
      new Set(vision.ingredients_ar.map((ingredient) => ingredient.trim()).filter(Boolean))
    );

    const matchedEntries = await Promise.all(
      uniqueIngredients.map(async (ingredient) => {
        const embedding = await embedText(`${ingredient}\n${note}`.trim());
        const { data, error } = await supabaseAdmin.rpc("match_rag_chunks", {
          query_embedding: toVectorLiteral(embedding),
          match_count: 1,
          min_similarity: 0.58,
        });

        if (error) {
          throw error;
        }

        return {
          ingredient,
          match: Array.isArray(data) && data.length > 0 ? (data[0] as MatchRow) : null,
        };
      })
    );

    const matchLookup = new Map(matchedEntries.map((entry) => [entry.ingredient, entry.match]));
    const matches = vision.ingredients_ar.map((ingredient) => ({
      ingredient,
      match: matchLookup.get(ingredient.trim()) ?? null,
    }));

    const assessment = buildMealAssessment(
      matches.filter((item): item is { ingredient: string; match: MatchRow } => item.match !== null)
    );

    const responsePayload = {
      meal_name_ar: vision.meal_name_ar,
      ingredients_ar: vision.ingredients_ar,
      brief_assessment_ar: vision.brief_assessment_ar,
      score: assessment.score,
      advice: assessment.advice,
      reason: assessment.reason,
      alternative: assessment.alternative,
      matches,
    };

    void supabaseAdmin
      .from("user_scans")
      .insert({
        image_url: null,
        analysis_result: responsePayload,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to store scan", error);
        }
      });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "تعذر تحليل الصورة حالياً. تحقق من المفاتيح أو أعد المحاولة بصورة أوضح.",
      },
      { status: 500 }
    );
  }
}
