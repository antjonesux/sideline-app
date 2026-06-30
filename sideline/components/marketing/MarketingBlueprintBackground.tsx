import { cn } from "@/lib/utils";

const BLUEPRINT_BACKGROUND_STYLE = {
  background: `
    radial-gradient(ellipse 80% 50% at 60% 40%, rgba(16,185,129,0.07) 0%, transparent 70%),
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
  `,
  backgroundSize: "cover, 56px 56px, 56px 56px",
} as const;

export function MarketingBlueprintBackground({
  className,
  variant = "section",
  showBottomFade = false,
}: {
  className?: string;
  variant?: "section" | "viewport";
  showBottomFade?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none bg-slate-950",
          variant === "viewport" ? "fixed inset-0 z-0" : "absolute inset-0",
          className,
        )}
        style={BLUEPRINT_BACKGROUND_STYLE}
        aria-hidden
      />
      {showBottomFade ? (
        <div
          className={cn(
            "pointer-events-none h-40",
            variant === "viewport"
              ? "fixed inset-x-0 bottom-0 z-0"
              : "absolute inset-x-0 bottom-0",
          )}
          style={{ background: "linear-gradient(to bottom, transparent, rgb(2 6 23))" }}
          aria-hidden
        />
      ) : null}
    </>
  );
}
