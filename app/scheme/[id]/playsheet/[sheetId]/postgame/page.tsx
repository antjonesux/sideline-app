import { PostGamePageClient } from "@/components/PostGamePageClient";
import { getPlaySheetWithPlays } from "@/lib/serverPlaySheets";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function PostGamePage({
  params,
}: {
  params: { id: string; sheetId: string };
}) {
  const sheet = await getPlaySheetWithPlays(params.sheetId);
  const defensiveLabel = sheet?.defensive_scheme ?? "Defense";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-4 py-16 font-mono text-sm text-[var(--chalk-muted)]">
          Loading…
        </div>
      }
    >
      <PostGamePageClient
        schemeId={params.id}
        sheetId={params.sheetId}
        defensiveLabel={defensiveLabel}
      />
    </Suspense>
  );
}
