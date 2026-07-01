import { Fragment } from "react";
import { cn } from "@/lib/utils";

export function CallSheetMetadataRow({
  labels,
  className,
}: {
  labels: string[];
  className?: string;
}) {
  if (labels.length === 0) return null;

  return (
    <p className={cn("flex min-w-0 flex-wrap items-center gap-y-1", className)}>
      {labels.map((label, index) => (
        <Fragment key={`${label}-${index}`}>
          {index > 0 ? (
            <span aria-hidden className="mx-1 text-slate-600">
              /
            </span>
          ) : null}
          <span className={index === labels.length - 1 ? "truncate" : undefined}>{label}</span>
        </Fragment>
      ))}
    </p>
  );
}
