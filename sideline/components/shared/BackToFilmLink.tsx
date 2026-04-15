import Link from "next/link";

const linkClass =
  "inline-flex items-center gap-x-2 rounded-lg border-0 bg-transparent px-2 py-2 align-middle text-sm font-medium text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500";

export function BackToFilmLink({ href = "/film" }: { href?: string }) {
  return (
    <Link href={href} className={linkClass}>
      <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </Link>
  );
}
