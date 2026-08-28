import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Button } from "@/components/ui/button";
import { buildLoginHref } from "@/lib/navigation/loginHref";

export const metadata: Metadata = {
  title: "Browse Playbooks — The Sideline",
  description: "Browse the full playbook database. Coming soon.",
};

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function PlaybooksEmptyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = first(sp.next);
  const nextFromUrl =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/playbooks";
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });

  return (
    <>
      <MarketingNav nextFromUrl={nextFromUrl} />
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pb-16 pt-24 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900">
            <BookOpen size={24} className="text-emerald-500" aria-hidden />
          </div>
          <h1 className="font-heading text-3xl font-extrabold normal-case tracking-tight text-white sm:text-4xl">
            Browse the full playbook database.
          </h1>
          <p className="mt-3 text-lg text-slate-400">Coming soon.</p>
          <div className="mt-10">
            <Button size="lg" asChild>
              <Link href={getStartedHref}>
                Get Started <ArrowRight size={15} aria-hidden />
              </Link>
            </Button>
          </div>
          <p className="mt-6">
            <Link
              href="/landing"
              className="text-sm text-slate-500 underline underline-offset-[3px] transition-colors hover:text-slate-300"
            >
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
