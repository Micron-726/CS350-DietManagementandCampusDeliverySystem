import type { Metadata } from "next";
import { Suspense } from "react";
import { HeaderFallback, SiteHeader } from "@/components/site-header";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "캠퍼스 식탁",
  description: "KAIST 교내 식당 메뉴, 영양 정보와 주문",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-lg focus:bg-card focus:p-3">본문으로 건너뛰기</a>
        <Suspense fallback={<HeaderFallback />}><SiteHeader /></Suspense>
        {children}
      </body>
    </html>
  );
}
