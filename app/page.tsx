import Image from "next/image";

import { AnalyzerForm } from "@/components/analyzer-form";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 border-2 border-border bg-black px-6 py-10 text-white shadow-industrial lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
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

        <section className="grid gap-6 border-2 border-border bg-card px-6 py-6 shadow-panel lg:grid-cols-[320px_1fr]">
          <div className="border-2 border-border bg-black p-2">
            <div className="relative aspect-[4/5] w-full overflow-hidden border-2 border-white/20">
              <Image
                alt="الدكتور ضياء العوضي"
                className="object-cover grayscale"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 320px"
                src="/Dhia.jpg"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 border-2 border-border p-4 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">تكريم</p>
              <p className="text-2xl font-black leading-10 md:text-3xl">
                هذا العمل هو تكريم لمسيرة الدكتور ورسالته في نشر "نظام الطيبات" للاستشفاء.
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

        <AnalyzerForm />
      </div>
    </main>
  );
}
