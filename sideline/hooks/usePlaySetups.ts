"use client";

import { COULDNT_DELETE, COULDNT_FINISH_THAT, COULDNT_SAVE } from "@/lib/coachCopy";
import { playSetupsQueryKeys } from "@/lib/playSetupsQueryKeys";
import type { PlayIdentity, PlaySetup } from "@/lib/types";
import { useToastStore } from "@/store/toastStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Signed setup image URLs expire ~1h; keep under that so URLs stay valid mid-session. */
const PLAY_SETUPS_STALE_MS = 30 * 60 * 1000;

function identitySearchParams(identity: PlayIdentity): string {
  const params = new URLSearchParams({
    game_version: identity.game_version,
    side_of_ball: identity.side_of_ball,
    playbook: identity.playbook,
    formation: identity.formation,
    play_name: identity.play_name,
  });
  return params.toString();
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string };
    if (typeof json.error === "string" && json.error.trim()) return json.error.trim();
  } catch {
    /* ignore */
  }
  return fallback;
}

export function usePlaySetups(identity: PlayIdentity | null | undefined) {
  const enabled = Boolean(
    identity?.game_version &&
      identity.side_of_ball &&
      identity.playbook &&
      identity.formation &&
      identity.play_name,
  );

  return useQuery({
    queryKey: identity
      ? playSetupsQueryKeys.list(identity)
      : ([...playSetupsQueryKeys.all, "list", "idle"] as const),
    enabled,
    staleTime: PLAY_SETUPS_STALE_MS,
    queryFn: async (): Promise<PlaySetup[]> => {
      if (!identity) return [];
      const res = await fetch(`/api/play-setups?${identitySearchParams(identity)}`);
      if (!res.ok) throw new Error(await readErrorMessage(res, COULDNT_FINISH_THAT));
      const json = (await res.json()) as { data?: PlaySetup[] };
      return json.data ?? [];
    },
  });
}

export function usePlaySetupCounts(
  gameVersion: string | null | undefined,
  sideOfBall: string | null | undefined,
  playbook: string | null | undefined,
) {
  const gv = (gameVersion ?? "").trim();
  const side = (sideOfBall ?? "").trim();
  const book = (playbook ?? "").trim();
  const enabled = Boolean(gv && side && book);

  return useQuery({
    queryKey: enabled
      ? playSetupsQueryKeys.counts(gv, side, book)
      : ([...playSetupsQueryKeys.all, "counts", "idle"] as const),
    enabled,
    staleTime: PLAY_SETUPS_STALE_MS,
    queryFn: async (): Promise<Record<string, number>> => {
      const params = new URLSearchParams({
        game_version: gv,
        side_of_ball: side,
        playbook: book,
      });
      const res = await fetch(`/api/play-setups/counts?${params}`);
      if (!res.ok) throw new Error(await readErrorMessage(res, COULDNT_FINISH_THAT));
      const json = (await res.json()) as { data?: Record<string, number> };
      return json.data ?? {};
    },
  });
}

type CreateInput = PlayIdentity & {
  title: string;
  notes: string;
};

type UpdateInput = {
  id: string;
  identity: PlayIdentity;
  title?: string;
  notes?: string;
  image_path?: string | null;
};

type DeleteInput = {
  id: string;
  identity: PlayIdentity;
};

type ReorderInput = PlayIdentity & {
  ordered_ids: string[];
};

export function usePlaySetupMutations() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const invalidateFor = (identity: PlayIdentity) => {
    void queryClient.invalidateQueries({ queryKey: playSetupsQueryKeys.list(identity) });
    void queryClient.invalidateQueries({
      queryKey: playSetupsQueryKeys.counts(
        identity.game_version,
        identity.side_of_ball,
        identity.playbook,
      ),
    });
  };

  const createSetup = useMutation({
    mutationFn: async (input: CreateInput): Promise<PlaySetup> => {
      const res = await fetch("/api/play-setups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_version: input.game_version,
          side_of_ball: input.side_of_ball,
          playbook: input.playbook,
          formation: input.formation,
          play_name: input.play_name,
          title: input.title,
          notes: input.notes,
        }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, COULDNT_SAVE));
      const json = (await res.json()) as { data: PlaySetup };
      return json.data;
    },
    onSuccess: (_data, vars) => {
      invalidateFor(vars);
    },
  });

  const updateSetup = useMutation({
    mutationFn: async (input: UpdateInput): Promise<PlaySetup> => {
      const body: Record<string, unknown> = {};
      if (input.title !== undefined) body.title = input.title;
      if (input.notes !== undefined) body.notes = input.notes;
      if (input.image_path !== undefined) body.image_path = input.image_path;
      const res = await fetch(`/api/play-setups/${encodeURIComponent(input.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, COULDNT_SAVE));
      const json = (await res.json()) as { data: PlaySetup };
      return json.data;
    },
    onSuccess: (_data, vars) => {
      invalidateFor(vars.identity);
    },
  });

  const deleteSetup = useMutation({
    mutationFn: async (input: DeleteInput): Promise<void> => {
      const res = await fetch(`/api/play-setups/${encodeURIComponent(input.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, COULDNT_DELETE));
    },
    onSuccess: (_data, vars) => {
      invalidateFor(vars.identity);
    },
    onError: (err) => {
      addToast(err instanceof Error ? err.message : COULDNT_DELETE, "error");
    },
  });

  const reorderSetups = useMutation({
    mutationFn: async (input: ReorderInput): Promise<void> => {
      const res = await fetch("/api/play-setups/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_version: input.game_version,
          side_of_ball: input.side_of_ball,
          playbook: input.playbook,
          formation: input.formation,
          play_name: input.play_name,
          ordered_ids: input.ordered_ids,
        }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, COULDNT_FINISH_THAT));
    },
    onSuccess: (_data, vars) => {
      invalidateFor(vars);
    },
  });

  return { createSetup, updateSetup, deleteSetup, reorderSetups, invalidateFor };
}
