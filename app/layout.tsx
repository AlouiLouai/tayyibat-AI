import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "@/app/globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tayyibat AI",
  description: "فاحص التزام غذائي مدعوم بالرؤية الحاسوبية وRAG وفق نظام الطيبات.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
