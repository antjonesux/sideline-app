"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { appShellIconBackButtonClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

export function BackChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

type SharedProps = {
  "aria-label": string;
  className?: string;
};

type LinkProps = SharedProps & {
  href: string;
  onClick?: ComponentPropsWithoutRef<"button">["onClick"];
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "aria-label" | "children">;

type ButtonProps = SharedProps & {
  href?: undefined;
  onClick: ComponentPropsWithoutRef<"button">["onClick"];
} & Omit<ComponentPropsWithoutRef<"button">, "onClick" | "className" | "aria-label" | "children" | "type">;

export function IconBackButton(props: LinkProps | ButtonProps) {
  const className = cn(appShellIconBackButtonClass, props.className);

  if ("href" in props && props.href) {
    const { href, "aria-label": ariaLabel, className: _c, onClick, ...rest } = props;
    return (
      <Link href={href} className={className} aria-label={ariaLabel} onClick={onClick} {...rest}>
        <BackChevronIcon />
      </Link>
    );
  }

  const buttonProps = props as ButtonProps;
  const { onClick, "aria-label": ariaLabel, className: _c, ...rest } = buttonProps;
  return (
    <button type="button" className={className} onClick={onClick} aria-label={ariaLabel} {...rest}>
      <BackChevronIcon />
    </button>
  );
}

/** Invisible spacer matching `IconBackButton` width for centered headers. */
export function IconBackButtonSpacer({ className }: { className?: string }) {
  return <span className={cn("h-8 w-11 shrink-0 invisible", className)} aria-hidden />;
}
