import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import BottomTabNav from "@/components/shared/BottomTabNav";
import PrelineScriptWrapper from "@/components/shared/PrelineScriptWrapper";
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
  description: "Personal OC journal and live play sheet",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${barlow.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-white">
        <AppProviders>
          <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 sm:py-8">{children}</main>
          <Toast />
          <BottomTabNav />
          <PrelineScriptWrapper />
        </AppProviders>
      </body>
    </html>
  );
}
