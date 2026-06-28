"use client";

import { getSituationColor } from "@/lib/constants";
import { getSituationIcon } from "@/lib/situationIcons";
import { cn } from "@/lib/utils";

export function SituationIconBadge({
  icon,
  colorKey,
  name,
  size = "md",
  className,
}: {
  icon?: string | null;
  colorKey: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const colors = getSituationColor(colorKey);
  const Icon = getSituationIcon(icon);
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  const iconSize = size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5";
  const circleSize = size === "sm" ? "h-[18px] w-[18px] text-[10px]" : "h-5 w-5 text-xs";

  if (Icon) {
    return <Icon className={cn(iconSize, "shrink-0", colors.text, className)} aria-hidden />;
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-heading font-bold",
        circleSize,
        colors.bg,
        colors.text,
        className,
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}
