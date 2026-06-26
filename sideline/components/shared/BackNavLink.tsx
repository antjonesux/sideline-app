import { IconBackButton } from "@/components/shared/IconBackButton";

/**
 * Primary “Back” control for app shell flows (Film list, Play Sheet, import, etc.).
 * Default target is Film Room; pass **`href`** for other parents (e.g. **`/playbook`** from **`/playbook/new`**).
 */
export function BackNavLink({
  href = "/film",
  "aria-label": ariaLabel = "Back",
}: {
  href?: string;
  "aria-label"?: string;
}) {
  return (
    <div className="flex w-full justify-start">
      <IconBackButton href={href} aria-label={ariaLabel} />
    </div>
  );
}
