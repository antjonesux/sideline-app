"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicFormationList } from "@/components/marketing/PublicFormationList";
import { PublicPlaybookDetailHeader } from "@/components/marketing/PublicPlaybookDetailHeader";
import { PublicPlaybookDetailSkeleton } from "@/components/marketing/PublicPlaybookDetailSkeleton";
import { PublicPlaybooksBreadcrumb, publicPlaybooksBreadcrumbTrail } from "@/components/marketing/PublicPlaybooksBreadcrumb";
import { PublicPlaybooksBrowseFrame } from "@/components/marketing/PublicPlaybooksBrowseFrame";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import type { PublicPlaybookFormationsData } from "@/lib/publicPlaybooksServer";

async function fetchPlaybookFormations(
  playbookId: string,
  side: string | null,
): Promise<PublicPlaybookFormationsData> {
  const qs = side === "defense" || side === "offense" ? `?side=${side}` : "";
  const res = await fetch(`/api/public/playbooks/${encodeURIComponent(playbookId)}/formations${qs}`);
  const json = (await res.json()) as { data?: PublicPlaybookFormationsData; error?: string };
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok || !json.data) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data;
}

type BrowsePlaybookDetailProps = {
  playbookId: string;
};

export function BrowsePlaybookDetail({ playbookId }: BrowsePlaybookDetailProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sideRaw = searchParams.get("side");
  const side = sideRaw === "defense" || sideRaw === "offense" ? sideRaw : null;

  const query = useQuery({
    queryKey: ["public", "playbooks", playbookId, side ?? ""],
    queryFn: () => fetchPlaybookFormations(playbookId, side),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "NOT_FOUND") return false;
      return failureCount < 2;
    },
  });

  const notFound = query.isError && query.error instanceof Error && query.error.message === "NOT_FOUND";

  return (
    <PublicPlaybooksBrowseFrame
      breadcrumb={
        <PublicPlaybooksBreadcrumb
          items={publicPlaybooksBreadcrumbTrail(Boolean(user), [
            { label: "Playbooks", href: "/playbooks" },
            { label: playbookId },
          ])}
        />
      }
    >
      {query.isPending ? (
        <>
          <div className="mt-4 space-y-3">
            <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-slate-700/55" aria-hidden />
            <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-slate-700/55" aria-hidden />
          </div>
          <PublicPlaybookDetailSkeleton />
        </>
      ) : null}

      {notFound ? (
        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900 px-4 py-8 text-center" role="alert">
          <p className="font-body text-base text-slate-200">Playbook not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/playbooks">Back to Playbooks</Link>
          </Button>
        </div>
      ) : null}

      {query.isError && !notFound ? (
        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center" role="alert">
          <p className="font-body text-sm text-slate-300">{COULDNT_LOAD}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {query.isSuccess && query.data ? (
        <>
          <PublicPlaybookDetailHeader name={query.data.name} sideOfBall={query.data.side_of_ball} />
          <PublicFormationList
            groups={query.data.formationGroups}
            playbookId={playbookId}
            side={side ?? query.data.side_of_ball}
          />
        </>
      ) : null}
    </PublicPlaybooksBrowseFrame>
  );
}
