"use client";

import { useEffect, useState } from "react";

import { AnalyzerForm } from "@/components/analyzer-form";
import { Badge } from "@/components/ui/badge";
import { DhiaImage } from "@/components/dhia-image";

const MOBILE_SPLASH_SESSION_KEY = "tayyibat-mobile-splash-seen";
const MOBILE_SPLASH_DURATION_MS = 1500;

export default function HomePage() {
  const [showMobileSplash, setShowMobileSplash] = useState(true);

  useEffect(() => {
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;

    if (!isMobileViewport) {
      setShowMobileSplash(false);
      return;
    }

    if (window.sessionStorage.getItem(MOBILE_SPLASH_SESSION_KEY) === "1") {
      setShowMobileSplash(false);
      return;
    }

    window.sessionStorage.setItem(MOBILE_SPLASH_SESSION_KEY, "1");

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeSplash = () => {
      document.body.style.overflow = previousOverflow;
      setShowMobileSplash(false);

      window.requestAnimationFrame(() => {
        document.getElementById("scan")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    const timeoutId = window.setTimeout(() => {
      closeSplash();
    }, MOBILE_SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <main className="min-h-screen md:px-8 md:py-8 lg:px-10">
      {showMobileSplash ? (
        <section className="fixed inset-0 z-50 flex min-h-[100svh] flex-col justify-between bg-black px-4 py-6 text-white shadow-industrial md:hidden">
          <div className="space-y-4">
            <Badge variant="destructive" className="w-fit">منهج طيبات 2026</Badge>
            <h1 className="text-2xl font-black leading-tight">
              فاحص الوجبات العربي بنظام الطيبات.
            </h1>
            <p className="max-w-xs text-sm leading-6 text-white/72">
              إهداء للدكتور ضياء العوضي. سيتم فتح شاشة الفحص خلال لحظات.
            </p>
          </div>

          <div className="space-y-3">
            <div className="mx-auto w-full max-w-[280px] border-2 border-white/20 bg-white/5 p-2">
              <div className="relative aspect-[4/5] w-full overflow-hidden border-2 border-white/20">
                <DhiaImage priority className="!absolute inset-0" />
              </div>
            </div>

            <div className="border-2 border-[#FF5722] bg-[#FF5722]/10 p-3">
              <p className="text-xs font-bold leading-6 text-white/84">
                الانتقال الآن إلى شاشة المسح ورفع الصورة.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 w-full overflow-hidden border border-white/20 bg-white/10">
              <div className="h-full w-full origin-right animate-[mobile-splash-progress_1.5s_linear_forwards] bg-[#FF5722]" />
            </div>
            <p className="text-center text-[10px] font-bold tracking-[0.18em] text-white/45">
              OPENING SCANNER
            </p>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
        <section className="hidden gap-6 border-2 border-border bg-black px-6 py-10 text-white shadow-industrial md:grid lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div className="space-y-5">
            <Badge variant="destructive" className="w-fit">منهج طيبات 2026</Badge>
            <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              فاحص الوجبات العربي المبني على الرؤية الحاسوبية والبحث الدلالي بنظام الطيبات.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/78 md:text-lg">
              هذا التطبيق إهداء للدكتور ضياء العوضي، ومصمم لخدمة المجتمع الذي بناه حول نظام الطيبات. ارفع صورة الطبق أو المنتج، وسيحدد النظام المكونات ويقارنها بقاعدة المعرفة ثم يعرض النسبة والنصيحة والسبب والبديل بالكامل بالعربية.
            </p>
            <div className="border-2 border-[#FF5722] bg-[#FF5722]/10 p-4">
              <p className="text-sm font-black leading-7 text-white md:text-base">
                تطبيق مجتمع الطيبات الأول، والمرجع العملي اليومي لكل من يريد تطبيق نظام الطيبات بصورة دقيقة وسريعة وواضحة.
              </p>
            </div>
          </div>
          <div className="grid gap-4 self-end md:grid-cols-3 lg:grid-cols-1">
            <div className="border-2 border-white/20 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Input</p>
              <p className="mt-3 text-lg font-black">صورة + ملاحظة اختيارية</p>
            </div>
            <div className="border-2 border-white/20 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Engine</p>
              <p className="mt-3 text-lg font-black">Gemini Vision + Gemini Embeddings</p>
            </div>
            <div className="border-2 border-white/20 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Output</p>
              <p className="mt-3 text-lg font-black">النسبة + النصيحة + السبب + البديل</p>
            </div>
          </div>
        </section>

        <section className="hidden gap-6 border-2 border-border bg-card px-6 py-6 shadow-panel md:grid lg:grid-cols-[320px_1fr]">
          <div className="border-2 border-border bg-black p-2">
            <div className="relative aspect-[4/5] w-full overflow-hidden border-2 border-white/20">
              <DhiaImage priority className="!absolute inset-0" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 border-2 border-border p-4 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">تكريم</p>
              <p className="text-2xl font-black leading-10 md:text-3xl">
                هذا العمل هو تكريم لمسيرة الدكتور ورسالته في نشر &quot;نظام الطيبات&quot; للاستشفاء.
              </p>
            </div>
            <div className="space-y-2 border-2 border-border p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">الذكرى</p>
              <p className="text-lg font-black leading-8">يبقى أثر الدكتور ضياء العوضي حاضراً في هذا المشروع وفي كل تجربة يستخدم فيها المجتمع هذا التطبيق.</p>
            </div>
            <div className="space-y-2 border-2 border-border p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">المجتمع</p>
              <p className="text-lg font-black leading-8">هذا التطبيق موجه لمجتمع الطيبات الذي التف حول النظام ويحمل رسالته إلى التطبيق العملي اليومي.</p>
            </div>
            <div className="space-y-2 border-2 border-border p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">المكانة</p>
              <p className="text-lg font-black leading-8">الهدف أن يكون التطبيق الأول لنظام الطيبات في التحليل والمتابعة والاعتماد اليومي.</p>
            </div>
          </div>
        </section>

        <section id="scan" className="scroll-mt-4 px-4 pb-6 md:px-0 md:pb-0 md:scroll-mt-8">
          <AnalyzerForm />
        </section>
      </div>
    </main>
  );
}
