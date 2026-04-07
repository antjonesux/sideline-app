import type { Metadata } from "next";
import { Bebas_Neue, DM_Mono } from "next/font/google";
import { Providers } from "./providers";
import PrelineScriptWrapper from "./components/PrelineScriptWrapper";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Sideline · CFB26 OC Assistant",
  description:
    "Scheme-based play calling for College Football 26. Formations, archetypes, and situational call sequences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${display.variable} ${mono.variable} min-h-screen bg-slate-950 font-mono text-slate-100 antialiased`}
      >
        <Providers>
          {children}
          <PrelineScriptWrapper />
        </Providers>
      </body>
    </html>
  );
}
