"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AddPlayToSheetModal } from "@/components/marketing/AddPlayToSheetModal";
import { PublicCrossRefSection } from "@/components/marketing/PublicCrossRefSection";
import { PublicPlaybooksBreadcrumb } from "@/components/marketing/PublicPlaybooksBreadcrumb";
import { PublicPlaybooksBrowseFrame } from "@/components/marketing/PublicPlaybooksBrowseFrame";
import { SignupToSavePlayModal } from "@/components/marketing/SignupToSavePlayModal";
import { PlayArtImage } from "@/components/playbook/PlayArtImage";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { SkeletonBlock } from "@/components/shared/AppSkeleton";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import type { CatalogSideOfBall } from "@/lib/constants";
import { resolvePlayArtUrl } from "@/lib/playArtUrl";
import {
  PUBLIC_PLAYBOOK_GAME_VERSION,
  type PublicPlaybookCrossRef,
  type PublicPlayDetailData,
} from "@/lib/publicPlaybooksServer";
import { stripFormationCategoryPrefix } from "@/lib/stripFormationCategoryPrefix";

async function fetchPlayDetail(
  playbookId: string,
  formationId: string,
  playId: string,
  side: string | null,
): Promise<PublicPlayDetailData> {
  const qs = side === "defense" || side === "offense" ? `?side=${side}` : "";
  const res = await fetch(
    `/api/public/playbooks/${encodeURIComponent(playbookId)}/formations/${encodeURIComponent(formationId)}/plays/${encodeURIComponent(playId)}${qs}`,
  );
  const json = (await res.json()) as { data?: PublicPlayDetailData; error?: string };
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok || !json.data) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data;
}

async function fetchPlayCrossRefs(playId: string, excludePlaybook: string): Promise<PublicPlaybookCrossRef[]> {
  const res = await fetch(
    `/api/public/plays/${encodeURIComponent(playId)}/playbooks?exclude=${encodeURIComponent(excludePlaybook)}`,
  );
  const json = (await res.json()) as { data?: PublicPlaybookCrossRef[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data ?? [];
}

type BrowsePlayDetailProps = {
  playbookId: string;
  formationId: string;
  playId: string;
};

export function BrowsePlayDetail({ playbookId, formationId, playId }: BrowsePlayDetailProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sideRaw = searchParams.get("side");
  const side = sideRaw === "defense" || sideRaw === "offense" ? sideRaw : null;
  const [signupOpen, setSignupOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["public", "play", playbookId, formationId, playId, side ?? ""],
    queryFn: () => fetchPlayDetail(playbookId, formationId, playId, side),
    staleTime: 5 * 60 * 1000,
    retry: (n, err) => (err instanceof Error && err.message === "NOT_FOUND" ? false : n < 2),
  });

  const crossQuery = useQuery({
    queryKey: ["public", "play-xrefs", playId, playbookId],
    queryFn: () => fetchPlayCrossRefs(playId, playbookId),
    enabled: detailQuery.isSuccess,
    staleTime: 5 * 60 * 1000,
  });

  const notFound =
    detailQuery.isError && detailQuery.error instanceof Error && detailQuery.error.message === "NOT_FOUND";

  const displayFormation = detailQuery.data
    ? stripFormationCategoryPrefix(detailQuery.data.formation, detailQuery.data.formation_type)
    : formationId;

  const returnPath = useMemo(() => {
    const base = `/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formationId)}/${encodeURIComponent(playId)}`;
    return side === "defense" ? `${base}?side=defense` : base;
  }, [playbookId, formationId, playId, side]);

  const art = detailQuery.data
    ? resolvePlayArtUrl({
        playbook: detailQuery.data.playbook,
        formation: detailQuery.data.formation,
        formationType: detailQuery.data.formation_type,
        playName: detailQuery.data.play_name,
        gameVersion: PUBLIC_PLAYBOOK_GAME_VERSION,
        side: detailQuery.data.side_of_ball as CatalogSideOfBall,
      })
    : null;

  const sideQs = side === "defense" ? "?side=defense" : "";

  return (
    <PublicPlaybooksBrowseFrame
      breadcrumb={
        <PublicPlaybooksBreadcrumb
          items={[
            { label: "Home", href: user ? "/playbook" : "/landing" },
            { label: "Playbooks", href: "/playbooks" },
            {
              label: playbookId,
              href: `/playbooks/${encodeURIComponent(playbookId)}${sideQs}`,
            },
            {
              label: displayFormation,
              href: `/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formationId)}${sideQs}`,
            },
            { label: playId },
          ]}
        />
      }
    >
      {detailQuery.isPending ? (
        <div className="mt-6 space-y-4" aria-busy="true">
          <SkeletonBlock className="h-3 w-40" />
          <SkeletonBlock className="h-9 w-72 max-w-full" />
          <SkeletonBlock className="mx-auto aspect-[16/10] w-full max-w-2xl rounded-xl" />
        </div>
      ) : null}

      {notFound ? (
        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900 px-4 py-8 text-center" role="alert">
          <p className="font-body text-base text-slate-200">Play not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link
              href={`/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formationId)}`}
            >
              Back to formation
            </Link>
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
          <header className="mt-4 text-center sm:text-left">
            <p className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
              {displayFormation}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-4xl">
              {detailQuery.data.play_name}
            </h1>
          </header>

          <div className="mx-auto mt-8 w-full max-w-2xl">
            <PlayArtImage
              src={art?.src ?? null}
              source={art?.source}
              alt={detailQuery.data.play_name}
            />
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              size="lg"
              onClick={() => {
                if (user) setAddOpen(true);
                else setSignupOpen(true);
              }}
            >
              Add to Call Sheet
            </Button>
          </div>

          <PublicCrossRefSection
            title="All playbooks with this play"
            refs={crossQuery.data ?? []}
            hrefFor={(ref) =>
              `/playbooks/${encodeURIComponent(ref.playbook)}/${encodeURIComponent(ref.formation)}/${encodeURIComponent(detailQuery.data.play_name)}${ref.side_of_ball === "defense" ? "?side=defense" : ""}`
            }
          />

          <SignupToSavePlayModal
            open={signupOpen}
            onOpenChange={setSignupOpen}
            playName={detailQuery.data.play_name}
            returnPath={returnPath}
          />
          <AddPlayToSheetModal
            open={addOpen}
            onOpenChange={setAddOpen}
            sourcePlaybook={playbookId}
            formation={detailQuery.data.formation}
            playName={detailQuery.data.play_name}
          />
        </>
      ) : null}
    </PublicPlaybooksBrowseFrame>
  );
}
