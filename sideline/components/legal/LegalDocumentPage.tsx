import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocumentPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 pb-16 sm:px-6 sm:py-14">
      <header className="mb-8 space-y-2 border-b border-slate-800 pb-6">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.08em] text-white sm:text-3xl">
          {title}
        </h1>
        <p className="font-sans text-sm text-slate-400">The Sideline — thesideline.pro</p>
        <p className="font-sans text-xs text-slate-500">Last updated: July 1, 2026</p>
      </header>

      <div className="space-y-8 font-sans text-sm leading-relaxed text-slate-300 sm:text-base">{children}</div>

      <footer className="mt-10 border-t border-slate-800 pt-6">
        <Link
          href="/landing"
          className="font-sans text-sm text-slate-400 transition-colors hover:text-white"
        >
          ← Back to welcome
        </Link>
      </footer>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold uppercase tracking-wide text-white sm:text-xl">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-sans text-base font-semibold text-white">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function LegalExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-300 underline underline-offset-2 transition-colors hover:text-white"
    >
      {children}
    </a>
  );
}

export function LegalInternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-slate-300 underline underline-offset-2 transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}
