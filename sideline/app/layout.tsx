import type { Metadata } from "next";
import { Bebas_Neue, DM_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import BottomTabNav from "@/components/shared/BottomTabNav";
import PrelineScriptWrapper from "@/components/shared/PrelineScriptWrapper";

const bebas = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Sideline",
  description: "Personal OC journal and live play sheet",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${bebas.variable} ${dmMono.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-white">
        <AppProviders>
          <main className="mx-auto max-w-3xl px-4 pb-20 pt-4">{children}</main>
          <BottomTabNav />
          <PrelineScriptWrapper />
        </AppProviders>
      </body>
    </html>
  );
}
