import { PlaybookHome } from "@/components/playbook/PlaybookHome";
import { PlaySheetHomeSkeleton } from "@/components/shared/PageSkeleton";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string | string[]; onboarding?: string | string[]; cfb26?: string | string[] }>;
}) {
  const sp = await searchParams;
  const create = first(sp.create);
  if (create === "1") {
    const p = new URLSearchParams();
    if (first(sp.onboarding) === "1") p.set("onboarding", "1");
    const cfb = first(sp.cfb26)?.trim();
    if (cfb) p.set("cfb26", cfb);
    const qs = p.toString();
    redirect(`/playbook/new${qs ? `?${qs}` : ""}`);
  }

  return (
    <Suspense fallback={<PlaySheetHomeSkeleton />}>
      <PlaybookHome />
    </Suspense>
  );
}
