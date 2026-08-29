"use client";

import { useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { appShellFormInputClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

type PublicPlaybookSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** True while debouncing or fetching — shows inline spinner. */
  loading?: boolean;
  className?: string;
};

export function PublicPlaybookSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  loading = false,
  className,
}: PublicPlaybookSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        enterKeyHint="search"
        className={cn(
          appShellFormInputClass,
          "ps-10",
          value.length > 0 || loading ? "pe-10" : "",
        )}
      />
      {loading ? (
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500"
          aria-hidden
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : value.length > 0 ? (
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
