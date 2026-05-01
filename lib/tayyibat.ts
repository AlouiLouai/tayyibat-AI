export type MatchRow = {
  id: string;
  food_item_ar: string;
  status: "Allowed" | "Forbidden" | "Caution";
  category_ar: string | null;
  explanation_ar: string | null;
  alternative_ar: string | null;
  video_ref: string | null;
  similarity: number;
};

type HealthContextResult = {
  advice: string;
  reason: string;
  summary: string;
  detectedConditions: string[];
  scorePenalty: number;
};

function uniqueIngredients(items: Array<{ ingredient: string; match: MatchRow }>, predicate: (item: { ingredient: string; match: MatchRow }) => boolean) {
  return Array.from(new Set(items.filter(predicate).map((item) => item.ingredient)));
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildHealthContext(note: string, matches: Array<{ ingredient: string; match: MatchRow }>) {
  const normalizedNote = normalizeText(note);
  const hasDiabetesContext = /(diabet|diabetic|diabetes|سكري|سكر|السكر|مقاومة الانسولين|insulin|glucose)/i.test(normalizedNote);
  const hasColonContext = /(قولون|colon|ibs|انتفاخ|نفخة|هضم)/i.test(normalizedNote);
  const hasRefluxContext = /(ارتجاع|حموضة|reflux|gerd)/i.test(normalizedNote);
  const hasPressureContext = /(ضغط|pressure|hypertension)/i.test(normalizedNote);
  const adviceParts: string[] = [];
  const reasonParts: string[] = [];
  const summaryParts: string[] = [];
  const detectedConditions: string[] = [];
  let scorePenalty = 0;

  if (hasDiabetesContext) {
    detectedConditions.push("سكري");
    const sugarSensitiveIngredients = uniqueIngredients(matches, ({ ingredient, match }) => {
      const combinedText = normalizeText(`${ingredient} ${match.food_item_ar} ${match.category_ar ?? ""}`);

      return /(سكر|عسل|تمر|موز|تين|عنب|شوكولات|بسبوسة|حلاوة|حلويات|سكريات)/i.test(combinedText);
    });

    if (sugarSensitiveIngredients.length > 0) {
      adviceParts.push(`ومع ملاحظة السكري، راقب ${sugarSensitiveIngredients.join("، ")} وقلل الحمل السكري للوجبة قدر الإمكان.`);
      reasonParts.push(`في سياق السكري، هذه المكونات ترفع كثافة السكريات أو تحتاج ضبطاً أدق في الكمية والتوقيت.`);
      summaryParts.push(`السياق الصحي يضيف تحفظاً على ${sugarSensitiveIngredients.join("، ")} بسبب الحمل السكري الأعلى.`);
      scorePenalty += 8;
    } else {
      adviceParts.push("ومع ملاحظة السكري، تبدو الوجبة أبعد عن السكريات الظاهرة لكن يبقى ضبط الكمية مهماً.");
      summaryParts.push("تم أخذ ملاحظة السكري في الاعتبار مع عدم ظهور سكريات واضحة بشكل مرتفع.");
    }
  }

  if (hasColonContext) {
    detectedConditions.push("قولون");
    const colonSensitiveIngredients = uniqueIngredients(matches, ({ ingredient, match }) => {
      const combinedText = normalizeText(`${ingredient} ${match.food_item_ar} ${match.category_ar ?? ""} ${match.explanation_ar ?? ""}`);

      return /(قولون|بقول|ألياف|ورقيات|ألبان|جلوتين|دقيق)/i.test(combinedText);
    });

    if (colonSensitiveIngredients.length > 0) {
      adviceParts.push(`ومع ملاحظة القولون، كن أشد حذراً مع ${colonSensitiveIngredients.join("، ")}.`);
      reasonParts.push("هذه الفئة مرتبطة في قاعدة الطيبات بثقل هضمي أعلى وتهييج أوضح للقولون.");
      summaryParts.push(`تم تشديد الحكم بسبب حساسية القولون تجاه ${colonSensitiveIngredients.join("، ")}.`);
      scorePenalty += 8;
    }
  }

  if (hasRefluxContext) {
    detectedConditions.push("ارتجاع");
    const refluxSensitiveIngredients = uniqueIngredients(matches, ({ ingredient, match }) => {
      const combinedText = normalizeText(`${ingredient} ${match.food_item_ar} ${match.explanation_ar ?? ""}`);

      return /(ارتجاع|دقيق|جلوتين|ألبان|خضار نيء|ورقيات)/i.test(combinedText);
    });

    if (refluxSensitiveIngredients.length > 0) {
      adviceParts.push(`ومع ملاحظة الارتجاع، يفضل إبعاد ${refluxSensitiveIngredients.join("، ")} عن الوجبة الحالية.`);
      reasonParts.push("هذه المكونات ترتبط في قاعدة المعرفة بزيادة تهيج الارتجاع واضطراب الهضم.");
      summaryParts.push(`تم رفع مستوى التحذير بسبب تأثير ${refluxSensitiveIngredients.join("، ")} على الارتجاع.`);
      scorePenalty += 8;
    }
  }

  if (hasPressureContext) {
    detectedConditions.push("ضغط");
    adviceParts.push("ومع ملاحظة الضغط، اجعل الوجبة أبسط وأقل إضافةً في المكونات الجانبية والمصنعات قدر الإمكان.");
    summaryParts.push("تم تبسيط التوصية بسبب ملاحظة الضغط والحاجة إلى وجبة أبسط وأهدأ.");
    scorePenalty += 4;
  }

  return {
    advice: adviceParts.join(" "),
    reason: reasonParts.join(" "),
    summary: summaryParts.join(" "),
    detectedConditions,
    scorePenalty,
  } satisfies HealthContextResult;
}

export function buildMealAssessment(matches: Array<{ ingredient: string; match: MatchRow }>, note = "") {
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
    ? Array.from(
        new Set(forbidden.map((item) => item.match.alternative_ar ?? "لحم بقر أو أرز أبيض أو سمن حيواني"))
      ).join("، ")
    : caution.length
      ? Array.from(
          new Set(caution.map((item) => item.match.alternative_ar ?? "لحم بقر أو أرز أبيض أو سمن حيواني"))
        ).join("، ")
      : "استمر على اللحوم الحمراء والنشويات والدهون الطبيعية المسموحة.";

  const healthContext = buildHealthContext(note, matches);
  score = Math.max(0, Math.min(100, score - healthContext.scorePenalty));

  return {
    score,
    advice: [advice, healthContext.advice].filter(Boolean).join(" "),
    reason: [reason, healthContext.reason].filter(Boolean).join(" "),
    alternative,
    healthContext: healthContext.summary,
    detectedConditions: healthContext.detectedConditions,
  };
}
