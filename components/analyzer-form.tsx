"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Camera, LoaderCircle, ScanSearch, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type IngredientMatch = {
  ingredient: string;
  match: {
    food_item_ar: string;
    status: "Allowed" | "Forbidden" | "Caution";
    category_ar: string | null;
    explanation_ar: string | null;
    similarity: number;
  } | null;
};

type AnalyzeResponse = {
  meal_name_ar: string;
  ingredients_ar: string[];
  score: number;
  advice: string;
  reason: string;
  alternative: string;
  healthContext: string;
  detectedConditions: string[];
  matches: IngredientMatch[];
};

const MAX_UPLOAD_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_INPUT_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1024;
const COMPRESSED_IMAGE_QUALITY = 0.72;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تعذر تجهيز الصورة للتحليل."));
    image.src = url;
  });
}

async function compressImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", COMPRESSED_IMAGE_QUALITY);
    });

    if (!blob) {
      return file;
    }

    if (blob.size >= file.size && scale === 1) {
      return file;
    }

    const fileName = file.name.replace(/\.[^.]+$/, "") || "meal";

    return new File([blob], `${fileName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function statusVariant(status: IngredientMatch["match"] extends infer T ? any : never) {
  if (status === "Forbidden") return "destructive" as const;
  if (status === "Caution") return "caution" as const;
  return "default" as const;
}

function statusLabel(status: "Allowed" | "Forbidden" | "Caution") {
  if (status === "Forbidden") return "ممنوع";
  if (status === "Caution") return "بحذر";
  return "مسموح";
}

export function AnalyzerForm() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("ارفع صورة الوجبة أولاً.");
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("note", note);

    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "فشل التحليل.");
        }

        setResult(payload);
      } catch (submitError) {
        setResult(null);
        setError(submitError instanceof Error ? submitError.message : "تعذر إتمام التحليل.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="bg-card/95">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl normal-case">ماسح الوجبات</CardTitle>
              <CardDescription>ارفع صورة الطبق أو المنتج، وسنقارن مكوناته بمنطق الطيبات.</CardDescription>
            </div>
            <Badge variant="outline" className="gap-2 px-3 py-2 text-[11px]">
              <Camera className="size-4" />
              رؤية + RAG
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="image">صورة الوجبة أو المنتج</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const nextFile = event.target.files?.[0] ?? null;

                  if (!nextFile) {
                    setFile(null);
                    return;
                  }

                  if (!nextFile.type.startsWith("image/")) {
                    setFile(null);
                    setError("نوع الملف غير مدعوم. ارفع صورة فقط.");
                    return;
                  }

                  if (nextFile.size > MAX_INPUT_IMAGE_BYTES) {
                    setFile(null);
                    setError("حجم الصورة كبير جداً. ارفع صورة أصغر من 12 ميجابايت.");
                    return;
                  }

                  setError(null);
                  setIsPreparingImage(true);

                  try {
                    const optimizedFile = await compressImage(nextFile);

                    if (optimizedFile.size > MAX_UPLOAD_IMAGE_BYTES) {
                      throw new Error("تعذر ضغط الصورة بما يكفي. جرب صورة أوضح أو أقل حجماً.");
                    }

                    setFile(optimizedFile);
                  } catch (imageError) {
                    setFile(null);
                    setError(imageError instanceof Error ? imageError.message : "تعذر تجهيز الصورة.");
                  } finally {
                    setIsPreparingImage(false);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">ملاحظة إضافية</Label>
              <Textarea
                id="note"
                placeholder="مثال: مريض سكري، قولون، ارتجاع، أو هذه وجبة فطور / منتج جبن مطبوخ"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <p className="text-xs leading-6 text-muted-foreground">
                اذكر الحالة أو الهدف إن وجد، مثل: سكري، قولون، ارتجاع، ضغط، أو حساسية من مكونات محددة.
              </p>
            </div>

            <Button className="w-full gap-2 text-base shadow-industrial" size="lg" type="submit" disabled={isPending || isPreparingImage}>
              {isPending || isPreparingImage ? <LoaderCircle className="size-5 animate-spin" /> : <ScanSearch className="size-5" />}
              {isPreparingImage ? "جارٍ تجهيز الصورة" : isPending ? "جارٍ تحليل الصورة" : "حلل الوجبة الآن"}
            </Button>

            {error ? (
              <div className="border-2 border-[#FF5722] bg-[#FF5722]/10 p-4 text-sm font-medium text-foreground">{error}</div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="min-h-[240px] overflow-hidden bg-black">
          <CardContent className="p-0">
            {previewUrl ? (
              <div className="relative h-[240px] w-full">
                <Image alt="معاينة الوجبة" className="object-cover" fill sizes="(max-width: 1280px) 100vw, 50vw" src={previewUrl} unoptimized />
              </div>
            ) : (
              <div className="flex h-[240px] flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
                <Sparkles className="size-8" />
                <p className="max-w-sm text-sm">واجهة صناعية حادة ومباشرة. ارفع صورة لبدء التحليل الدلالي للمكونات.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="normal-case">النتيجة</CardTitle>
            <CardDescription>النسبة، النصيحة، السبب، والبديل وفق قاعدة الطيبات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {result ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border-2 border-border p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Tayyibat Score</p>
                    <p className="mt-2 text-5xl font-black text-primary">{result.score}%</p>
                  </div>
                  <div className="border-2 border-border p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">الوجبة</p>
                    <p className="mt-2 text-2xl font-black">{result.meal_name_ar}</p>
                    {result.detectedConditions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.detectedConditions.map((condition) => (
                          <Badge key={condition} variant="caution">{condition}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 border-2 border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <ShieldAlert className="size-4 text-primary" />
                    نصيحة
                  </div>
                  <p className="text-sm leading-7">{result.advice}</p>
                </div>

                {result.healthContext ? (
                  <div className="space-y-3 border-2 border-[#FF5722]/40 bg-[#FF5722]/5 p-4">
                    <p className="text-sm font-black">السياق الصحي</p>
                    <p className="text-sm leading-7 text-muted-foreground">{result.healthContext}</p>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border-2 border-border p-4">
                    <p className="text-sm font-black">السبب</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.reason}</p>
                  </div>
                  <div className="border-2 border-border p-4">
                    <p className="text-sm font-black">البديل</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.alternative}</p>
                  </div>
                </div>

                <div className="space-y-3 border-2 border-border p-4">
                  <p className="text-sm font-black">المكونات المرصودة</p>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients_ar.map((ingredient) => (
                      <Badge key={ingredient} variant="outline">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 border-2 border-border p-4">
                  <p className="text-sm font-black">مطابقة قاعدة المعرفة</p>
                  <div className="space-y-3">
                    {result.matches.map((item) => (
                      <div className="border-2 border-border p-3" key={`${item.ingredient}-${item.match?.food_item_ar ?? 'none'}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black">{item.ingredient}</span>
                          {item.match ? (
                            <Badge variant={statusVariant(item.match.status)}>{statusLabel(item.match.status)}</Badge>
                          ) : (
                            <Badge variant="outline">غير محسوم</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.match
                            ? `${item.match.food_item_ar} · ${item.match.category_ar ?? "بدون تصنيف"} · تشابه ${Math.round(item.match.similarity * 100)}%`
                            : "لم نجد تطابقاً قوياً بما يكفي في قاعدة المعرفة الحالية."}
                        </p>
                        {item.match?.explanation_ar ? (
                          <p className="mt-2 text-sm leading-7">{item.match.explanation_ar}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="border-2 border-dashed border-border p-6 text-sm leading-7 text-muted-foreground">
                سترى هنا نسبة الالتزام، سبب الحكم، والبدائل المقترحة بعد رفع الصورة وتحليلها.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
