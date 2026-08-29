"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicCrossRefSection } from "@/components/marketing/PublicCrossRefSection";
import { PublicPlayTile } from "@/components/marketing/PublicPlayTile";
import { PublicPlaybooksBreadcrumb } from "@/components/marketing/PublicPlaybooksBreadcrumb";
import { PublicPlaybooksBrowseFrame } from "@/components/marketing/PublicPlaybooksBrowseFrame";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { SkeletonBlock } from "@/components/shared/AppSkeleton";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import { stripFormationCategoryPrefix } from "@/lib/stripFormationCategoryPrefix";
import type {
  PublicFormationDetailData,
  PublicPlaybookCrossRef,
} from "@/lib/publicPlaybooksServer";

async function fetchFormationDetail(
  playbookId: string,
  formationId: string,
  side: string | null,
): Promise<PublicFormationDetailData> {
  const qs = side === "defense" || side === "offense" ? `?side=${side}` : "";
  const res = await fetch(
    `/api/public/playbooks/${encodeURIComponent(playbookId)}/formations/${encodeURIComponent(formationId)}/plays${qs}`,
  );
  const json = (await res.json()) as { data?: PublicFormationDetailData; error?: string };
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok || !json.data) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data;
}

async function fetchFormationCrossRefs(
  formationId: string,
  excludePlaybook: string,
): Promise<PublicPlaybookCrossRef[]> {
  const res = await fetch(
    `/api/public/formations/${encodeURIComponent(formationId)}/playbooks?exclude=${encodeURIComponent(excludePlaybook)}`,
  );
  const json = (await res.json()) as { data?: PublicPlaybookCrossRef[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data ?? [];
}

type BrowseFormationDetailProps = {
  playbookId: string;
  formationId: string;
};

export function BrowseFormationDetail({ playbookId, formationId }: BrowseFormationDetailProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sideRaw = searchParams.get("side");
  const side = sideRaw === "defense" || sideRaw === "offense" ? sideRaw : null;

  const detailQuery = useQuery({
    queryKey: ["public", "formation", playbookId, formationId, side ?? ""],
    queryFn: () => fetchFormationDetail(playbookId, formationId, side),
    staleTime: 5 * 60 * 1000,
    retry: (n, err) => (err instanceof Error && err.message === "NOT_FOUND" ? false : n < 2),
  });

  const crossQuery = useQuery({
    queryKey: ["public", "formation-xrefs", formationId, playbookId],
    queryFn: () => fetchFormationCrossRefs(formationId, playbookId),
    enabled: detailQuery.isSuccess,
    staleTime: 5 * 60 * 1000,
  });

  const notFound =
    detailQuery.isError && detailQuery.error instanceof Error && detailQuery.error.message === "NOT_FOUND";

  const displayFormation = detailQuery.data
    ? stripFormationCategoryPrefix(detailQuery.data.formation, detailQuery.data.formation_type)
    : formationId;

  const sideQs = side === "defense" ? "?side=defense" : "";

  return (
    <PublicPlaybooksBrowseFrame
      breadcrumb={
        <PublicPlaybooksBreadcrumb
          items={[
            { label: "Home", href: user ? "/playbook" : "/landing" },
            { label: "Playbooks", href: "/playbooks" },
            { label: playbookId, href: `/playbooks/${encodeURIComponent(playbookId)}${sideQs}` },
            { label: displayFormation },
          ]}
        />
      }
    >
      {detailQuery.isPending ? (
        <div className="mt-6 space-y-4" aria-busy="true">
          <SkeletonBlock className="h-8 w-64 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-xl" />
          <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="min-h-[10rem] w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : null}

      {notFound ? (
        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900 px-4 py-8 text-center" role="alert">
          <p className="font-body text-base text-slate-200">Formation not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/playbooks/${encodeURIComponent(playbookId)}`}>Back to playbook</Link>
          </Button>
        </div>
      ) : null}

      {detailQuery.isError && !notFound ? (
        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center" role="alert">
          <p className="font-body text-sm text-slate-300">{COULDNT_LOAD}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void detailQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {detailQuery.isSuccess && detailQuery.data ? (
        <>
          <header className="mt-4">
            <h1 className="font-heading text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
              {displayFormation}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Every play in {displayFormation} in the {detailQuery.data.playbook}{" "}
              {detailQuery.data.side_of_ball === "defense" ? "defensive" : "offensive"} playbook.
            </p>
          </header>

          <ul className="mt-8 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {detailQuery.data.plays.map((play) => (
              <li key={play.play_name}>
                <PublicPlayTile
                  href={`/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formationId)}/${encodeURIComponent(play.play_name)}${sideQs}`}
                  playbook={detailQuery.data.playbook}
                  formation={detailQuery.data.formation}
                  formationType={detailQuery.data.formation_type}
                  playName={play.play_name}
                  sideOfBall={detailQuery.data.side_of_ball}
                />
              </li>
            ))}
          </ul>

          <PublicCrossRefSection
            title="Also in these playbooks"
            refs={crossQuery.data ?? []}
            hrefFor={(ref) =>
              `/playbooks/${encodeURIComponent(ref.playbook)}/${encodeURIComponent(ref.formation)}${ref.side_of_ball === "defense" ? "?side=defense" : ""}`
            }
          />
        </>
      ) : null}
    </PublicPlaybooksBrowseFrame>
  );
}
