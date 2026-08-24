"use client";

import {
  CATALOG_GAME_VERSION_LABELS,
  CATALOG_GAME_VERSIONS,
} from "@/lib/constants";
import { parseCallSheetVersionFilter } from "@/lib/callSheetVersionFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
  className?: string;
};

export function CallSheetsVersionFilter({ className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseCallSheetVersionFilter(searchParams.get("version"));

  const onChange = useCallback(
    (next: string) => {
      const value = parseCallSheetVersionFilter(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("version", value);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className={className}>
      <Select value={selected} onValueChange={onChange}>
        <SelectTrigger className="hs-input h-auto w-full max-w-xs rounded-lg border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:ring-emerald-500/25">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
          {CATALOG_GAME_VERSIONS.map((version) => (
            <SelectItem
              key={version}
              value={version}
              className="font-body text-sm text-slate-100 focus:bg-slate-800 focus:text-white"
            >
              {CATALOG_GAME_VERSION_LABELS[version]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
