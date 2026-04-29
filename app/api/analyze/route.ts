import { NextResponse } from "next/server";

import { embedTexts } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildMealAssessment, type MatchRow } from "@/lib/tayyibat";
import { analyzeMealImage } from "@/lib/vision";

export const runtime = "edge";
export const preferredRegion = "auto";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

type BulkMatchRow = MatchRow & {
  ingredient: string;
  match_source: "exact" | "search_text" | "vector";
};

type KnowledgeRow = MatchRow & {
  search_text_ar: string | null;
};

type AnalysisResponse = {
  meal_name_ar: string;
  ingredients_ar: string[];
  score: number;
  advice: string;
  reason: string;
  alternative: string;
  healthContext: string;
  detectedConditions: string[];
  matches: Array<{ ingredient: string; match: MatchRow | null }>;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000;
const EMBEDDING_CACHE_TTL_MS = 30 * 60 * 1000;
const KNOWLEDGE_CACHE_TTL_MS = 5 * 60 * 1000;

const analysisCache = new Map<string, CacheEntry<AnalysisResponse>>();
const embeddingCache = new Map<string, CacheEntry<number[]>>();
let knowledgeCache: CacheEntry<KnowledgeRow[]> | null = null;

function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesSearchText(ingredient: string, searchText: string | null) {
  const normalizedIngredient = normalizeText(ingredient);
  const normalizedSearchText = normalizeText(searchText);

  if (!normalizedIngredient || !normalizedSearchText) {
    return false;
  }

  const wildcardNeedle = escapeRegExp(normalizedIngredient).replace(/\s+/g, ".*");
  return new RegExp(wildcardNeedle).test(normalizedSearchText);
}

async function getKnowledgeRows() {
  if (knowledgeCache && Date.now() <= knowledgeCache.expiresAt) {
    return knowledgeCache.value;
  }

  const { data, error } = await supabaseAdmin
    .from("tayyibat_knowledge")
    .select("id, food_item_ar, status, category_ar, explanation_ar, alternative_ar, video_ref, search_text_ar")
    .order("food_item_ar", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as KnowledgeRow[];
  knowledgeCache = {
    value: rows,
    expiresAt: Date.now() + KNOWLEDGE_CACHE_TTL_MS,
  };

  return rows;
}

async function matchIngredientsByText(ingredients: string[]) {
  if (ingredients.length === 0) {
    return [] as BulkMatchRow[];
  }

  const knowledgeRows = await getKnowledgeRows();
  const matches: BulkMatchRow[] = [];

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeText(ingredient);
    const exactMatch = knowledgeRows.find(
      (row) => normalizeText(row.food_item_ar) === normalizedIngredient
    );

    if (exactMatch) {
      matches.push({
        ...exactMatch,
        ingredient,
        similarity: 1,
        match_source: "exact" as const,
      });
      continue;
    }

    const searchTextMatch = knowledgeRows.find((row) => matchesSearchText(ingredient, row.search_text_ar));

    if (searchTextMatch) {
      matches.push({
        ...searchTextMatch,
        ingredient,
        similarity: 0.97,
        match_source: "search_text" as const,
      });
      continue;
    }

  }

  return matches;
}

async function getEmbeddingsForIngredients(ingredients: string[]) {
  const orderedEmbeddings = new Array<number[]>(ingredients.length);
  const uncachedIngredients: string[] = [];
  const uncachedIndexes: number[] = [];

  ingredients.forEach((ingredient, index) => {
    const cachedEmbedding = getCachedValue(embeddingCache, ingredient);

    if (cachedEmbedding) {
      orderedEmbeddings[index] = cachedEmbedding;
      return;
    }

    uncachedIngredients.push(ingredient);
    uncachedIndexes.push(index);
  });

  if (uncachedIngredients.length > 0) {
    const fetchedEmbeddings = await embedTexts(uncachedIngredients);

    fetchedEmbeddings.forEach((embedding, index) => {
      const ingredient = uncachedIngredients[index];
      const targetIndex = uncachedIndexes[index];

      setCachedValue(embeddingCache, ingredient, embedding, EMBEDDING_CACHE_TTL_MS);
      orderedEmbeddings[targetIndex] = embedding;
    });
  }

  return orderedEmbeddings;
}

async function matchIngredientsByEmbedding(ingredients: string[]) {
  if (ingredients.length === 0) {
    return [] as BulkMatchRow[];
  }

  const embeddings = await getEmbeddingsForIngredients(ingredients);
  const { data, error } = await supabaseAdmin.rpc("match_rag_ingredients", {
    query_ingredients: ingredients,
    query_embeddings: embeddings.map((embedding) => toVectorLiteral(embedding)),
    min_similarity: 0.58,
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []) as BulkMatchRow[];
}

async function createAnalysisCacheKey(imageBuffer: ArrayBuffer, note: string) {
  const noteBytes = new TextEncoder().encode(note);
  const imageBytes = new Uint8Array(imageBuffer);
  const composite = new Uint8Array(imageBytes.length + noteBytes.length);

  composite.set(imageBytes, 0);
  composite.set(noteBytes, imageBytes.length);

  const digest = await crypto.subtle.digest("SHA-256", composite);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
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

    const imageBuffer = await image.arrayBuffer();
    const analysisCacheKey = await createAnalysisCacheKey(imageBuffer, note);
    const cachedAnalysis = getCachedValue(analysisCache, analysisCacheKey);

    if (cachedAnalysis) {
      return NextResponse.json(cachedAnalysis, {
        headers: {
          "x-tayyibat-cache": "hit",
        },
      });
    }

    const vision = await analyzeMealImage({
      mimeType: image.type || "image/jpeg",
      base64Data: arrayBufferToBase64(imageBuffer),
      note,
    });

    const uniqueIngredients = Array.from(
      new Set(vision.ingredients_ar.map((ingredient) => ingredient.trim()).filter(Boolean))
    );
    const textMatches = await matchIngredientsByText(uniqueIngredients);
    const textMatchLookup = new Map(textMatches.map((entry) => [entry.ingredient, entry]));
    const unresolvedIngredients = uniqueIngredients.filter((ingredient) => !textMatchLookup.has(ingredient));
    const vectorMatches = await matchIngredientsByEmbedding(unresolvedIngredients);
    const matchLookup = new Map<string, MatchRow | null>();

    for (const entry of textMatches) {
      matchLookup.set(entry.ingredient, entry);
    }

    for (const entry of vectorMatches) {
      matchLookup.set(entry.ingredient, entry);
    }

    const matches = vision.ingredients_ar.map((ingredient) => ({
      ingredient,
      match: matchLookup.get(ingredient.trim()) ?? null,
    }));

    const assessment = buildMealAssessment(
      matches.filter((item): item is { ingredient: string; match: MatchRow } => item.match !== null),
      note
    );

    const responsePayload: AnalysisResponse = {
      meal_name_ar: vision.meal_name_ar,
      ingredients_ar: vision.ingredients_ar,
      score: assessment.score,
      advice: assessment.advice,
      reason: assessment.reason,
      alternative: assessment.alternative,
      healthContext: assessment.healthContext,
      detectedConditions: assessment.detectedConditions,
      matches,
    };

    setCachedValue(analysisCache, analysisCacheKey, responsePayload, ANALYSIS_CACHE_TTL_MS);

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

    return NextResponse.json(responsePayload, {
      headers: {
        "x-tayyibat-cache": "miss",
      },
    });
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
