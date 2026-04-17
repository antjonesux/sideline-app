"use client";

import Link from "next/link";

type Segment = {
  label: string;
  href?: string;
};

type Props = {
  segments: Segment[];
};

export function Breadcrumb({ segments }: Props) {
  if (!segments.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="font-body hidden items-center gap-1 text-xs text-[#A0A3AD] sm:flex">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const content = segment.href && !isLast ? (
          <Link href={segment.href} className="hover:text-slate-200">
            {segment.label}
          </Link>
        ) : (
          <span className={isLast ? "text-white" : ""}>{segment.label}</span>
        );

        return (
          <span key={`${segment.label}-${index}`} className="flex items-center gap-1">
            {content}
            {!isLast ? <span className="text-[#A0A3AD]">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
