import Link from "next/link";

const linkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border-0 bg-transparent py-2 pl-0 pr-3 align-middle font-sans text-sm font-medium text-slate-400 hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

export function BackToFilmLink({ href = "/film", showIcon = true }: { href?: string; showIcon?: boolean }) {
  return (
    <div className="flex w-full justify-start">
      <Link href={href} className={`${linkClass} ${showIcon ? "gap-x-2" : ""}`}>
        {showIcon ? (
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        ) : null}
        Back
      </Link>
    </div>
  );
}
