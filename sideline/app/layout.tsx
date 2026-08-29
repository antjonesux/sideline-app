import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppShellChrome } from "@/components/shared/AppShellChrome";
import BottomTabNav from "@/components/shared/BottomTabNav";
import { appShellMainClass } from "@/lib/constants/designTokens";

import { EmailVerificationBanner } from "@/components/shared/EmailVerificationBanner";
import { Toast } from "@/components/shared/Toast";

const barlow = Barlow({ variable: "--font-barlow", weight: ["400", "500", "600", "700"], subsets: ["latin"] });
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
        <AppProviders>
          {/**
           * Chrome flags + optional tab bar — must sit inside AuthProvider (adaptive `/playbooks`).
           * Responsive shell: `AppShellChrome` (sidebar at md+), `globals.css` `.app-shell-main`
           * + `--app-shell-*` tokens. Bottom padding clears the fixed tab bar on mobile only.
           */}
          <Suspense fallback={null}>
            <BottomTabNav />
          </Suspense>
          <Suspense fallback={null}>
            <AppShellChrome>
              <main className={appShellMainClass}>
                <EmailVerificationBanner />
                {children}
              </main>
            </AppShellChrome>
          </Suspense>
          <Toast />
        </AppProviders>
      </body>
    </html>
  );
}
