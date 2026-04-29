import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import BottomTabNav from "@/components/shared/BottomTabNav";

import { Toast } from "@/components/shared/Toast";

const barlow = Barlow({ variable: "--font-barlow", weight: ["400", "500", "600"], subsets: ["latin"] });
const barlowCondensed = Barlow_Condensed({ variable: "--font-barlow-condensed", weight: ["600", "700"], subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Sideline",
  description: "Study your game. Call it smarter.",
};

/** Lets `env(safe-area-inset-*)` apply on notched devices (home indicator). */
export const viewport: Viewport = {
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${barlow.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-950 text-white">
        <BottomTabNav />
        <AppProviders>
          {/**
           * Bottom padding must stay large at *all* breakpoints: `sm:py-8` previously overwrote `pb-24`
           * and left only32px under the fixed tab bar (~60–72px + safe area).
           * ~7rem (pb-28) + safe-area clears the nav with room to spare.
           */}
          <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-6">
            {children}
          </main>
          <Toast />
        </AppProviders>
      </body>
    </html>
  );
}
