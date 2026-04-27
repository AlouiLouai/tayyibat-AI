import knowledge from "@/data/tayyibat-knowledge.json";

export type MatchRow = {
  id: string;
  food_item_ar: string;
  status: "Allowed" | "Forbidden" | "Caution";
  category_ar: string | null;
  explanation_ar: string | null;
  video_ref: string | null;
  similarity: number;
};

type KnowledgeEntry = {
  food_item_ar: string;
  status: "Allowed" | "Forbidden" | "Caution";
  category_ar: string;
  explanation_ar: string;
  alternative_ar: string;
};

const alternatives = new Map(
  (knowledge as KnowledgeEntry[]).map((entry) => [entry.food_item_ar, entry.alternative_ar])
);

export function getAlternative(foodItem: string) {
  return alternatives.get(foodItem) ?? "أرز أو بطاطس أو لحم ضاني";
}

export function buildMealAssessment(matches: Array<{ ingredient: string; match: MatchRow }>) {
  const forbidden = matches.filter((item) => item.match.status === "Forbidden");
  const caution = matches.filter((item) => item.match.status === "Caution");
  const allowed = matches.filter((item) => item.match.status === "Allowed");

  let score = 100;
  score -= forbidden.length * 34;
  score -= caution.length * 12;
  score = Math.max(0, Math.min(100, score));

  const advice = forbidden.length
    ? `الوجبة غير متوافقة لأن فيها ${forbidden.map((item) => item.ingredient).join("، ")}.`
    : caution.length
      ? `الوجبة مقبولة بحذر، مع تقليل ${caution.map((item) => item.ingredient).join("، ")}.`
      : "الوجبة متوافقة بدرجة جيدة مع نظام الطيبات.";

  const reason = forbidden.length
    ? forbidden
        .map((item) => item.match.explanation_ar || `${item.ingredient} غير مناسب وفق قاعدة الهضم السهل.`)
        .join(" ")
    : caution.length
      ? caution
          .map((item) => item.match.explanation_ar || `${item.ingredient} يحتاج استخداماً محدوداً.`)
          .join(" ")
      : allowed.length
        ? allowed
            .slice(0, 2)
            .map((item) => item.match.explanation_ar || `${item.ingredient} مسموح.`)
            .join(" ")
        : "لم تظهر مكونات كافية للحكم الدقيق.";

  const alternative = forbidden.length
    ? Array.from(new Set(forbidden.map((item) => getAlternative(item.match.food_item_ar)))).join("، ")
    : caution.length
      ? Array.from(new Set(caution.map((item) => getAlternative(item.match.food_item_ar)))).join("، ")
      : "استمر على النشويات الأساسية والدهون الطبيعية والبروتينات المسموحة.";

  return {
    score,
    advice,
    reason,
    alternative,
  };
}
