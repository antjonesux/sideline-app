import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  FILM_ROOM_EMPTY_BODY,
  FILM_ROOM_EMPTY_CTA,
  FILM_ROOM_EMPTY_HEADLINE,
} from "@/lib/coachCopy";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import { FilmGameCard } from "@/components/film/FilmGameCard";
import { FilmRoomHomeHeader } from "@/components/film/FilmRoomHomeHeader";
import { FilmRoomVersionFilter } from "@/components/film/FilmRoomVersionFilter";
import { FilmRoomOnboarding } from "@/components/onboarding/FilmRoomOnboarding";
import {
  FILM_ROOM_VERSION_ALL,
  filmRoomNewGameHref,
  gameMatchesFilmRoomVersionFilter,
  parseFilmRoomVersionFilter,
  type FilmRoomVersionFilterValue,
} from "@/lib/filmRoomVersionFilter";
import { appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type GameSessionRow = {
  id: string;
  my_playbook: string;
  my_scheme: string;
  offensive_playbook?: string | null;
  opponent_team: string;
  opponent_scheme: string;
  my_score: number | null;
  opponent_score: number | null;
  result: "W" | "L" | null;
  game_date: string;
  quarter_started_logging: number | null;
  created_at: string;
  import_source?: string | null;
  game_version?: string | null;
  play_sheet_id?: string | null;
  defensive_play_sheet_id?: string | null;
};

type LoggedPlayStatsRow = {
  game_session_id: string;
  play_name: string | null;
  yards_gained: number | null;
  result_tag: string | null;
};

type GameWithCounts = GameSessionRow & {
  driveCount: number;
  playCount: number;
  totalYards: number;
  tds: number;
  turnovers: number;
  defenseLabel: string;
};

async function getGamesWithCounts(
  userId: string,
  versionFilter: FilmRoomVersionFilterValue,
): Promise<GameWithCounts[]> {
  const supabase = await createClient();
  let query = supabase
    .from("game_sessions")
    .select(
      "id, my_playbook, my_scheme, offensive_playbook, opponent_team, opponent_scheme, my_score, opponent_score, result, game_date, quarter_started_logging, created_at, import_source, game_version, play_sheet_id, defensive_play_sheet_id",
    )
    .eq("user_id", userId);

  if (versionFilter !== FILM_ROOM_VERSION_ALL) {
    query = query.eq("game_version", versionFilter);
  }

  const { data: gamesRaw, error: gameError } = await query.order("created_at", { ascending: false });

  if (gameError || !gamesRaw?.length) return [];

  const games = (gamesRaw as GameSessionRow[]).filter(
    (g) => g.import_source !== GAME_SESSION_IMPORT_SOURCE_ONBOARDING,
  );
  if (games.length === 0) return [];

  const gameIds = games.map((g) => g.id);
  const sheetIds = [
    ...new Set(
      games.flatMap((g) => [g.play_sheet_id, g.defensive_play_sheet_id].filter(Boolean) as string[]),
    ),
  ];

  const sheetNameById = new Map<string, string>();
  if (sheetIds.length > 0) {
    const { data: sheets } = await supabase
      .from("play_sheets")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", sheetIds);
    for (const row of sheets ?? []) {
      sheetNameById.set(row.id, String(row.name ?? "").trim());
    }
  }

  const [{ data: drives }, { data: loggedPlays, error: playError }] = await Promise.all([
    supabase.from("drives").select("id, game_session_id").eq("user_id", userId).in("game_session_id", gameIds),
    supabase
      .from("logged_plays")
      .select("game_session_id, play_name, yards_gained, result_tag")
      .eq("user_id", userId)
      .in("game_session_id", gameIds),
  ]);

  const driveCountByGame = new Map<string, number>();
  for (const d of drives ?? []) {
    driveCountByGame.set(d.game_session_id, (driveCountByGame.get(d.game_session_id) ?? 0) + 1);
  }

  if (playError) {
    return (games as GameSessionRow[]).map((game) => ({
      ...game,
      driveCount: driveCountByGame.get(game.id) ?? 0,
      playCount: 0,
      totalYards: 0,
      tds: 0,
      turnovers: 0,
      defenseLabel: resolveDefenseLabel(game, sheetNameById),
    }));
  }

  const byGame = new Map<string, { playCount: number; totalYards: number; tds: number; turnovers: number }>();

  for (const play of (loggedPlays ?? []) as LoggedPlayStatsRow[]) {
    const playName = String(play.play_name ?? "").trim().toLowerCase();
    const resultTag = String(play.result_tag ?? "").trim().toLowerCase();
    if (playName === "punt" || resultTag === "punt") continue;
    const current = byGame.get(play.game_session_id) ?? {
      playCount: 0,
      totalYards: 0,
      tds: 0,
      turnovers: 0,
    };
    current.playCount += 1;
    current.totalYards += play.yards_gained ?? 0;
    if (play.result_tag === "TOUCHDOWN") current.tds += 1;
    if (play.result_tag === "TURNOVER") current.turnovers += 1;
    byGame.set(play.game_session_id, current);
  }

  return (games as GameSessionRow[]).map((game) => {
    const agg = byGame.get(game.id);
    return {
      ...game,
      driveCount: driveCountByGame.get(game.id) ?? 0,
      playCount: agg?.playCount ?? 0,
      totalYards: agg?.totalYards ?? 0,
      tds: agg?.tds ?? 0,
      turnovers: agg?.turnovers ?? 0,
      defenseLabel: resolveDefenseLabel(game, sheetNameById),
    };
  });
}

function resolveDefenseLabel(
  game: GameSessionRow,
  sheetNameById: Map<string, string>,
): string {
  const defenseSheetId = game.defensive_play_sheet_id?.trim();
  if (defenseSheetId) {
    const sheetName = sheetNameById.get(defenseSheetId);
    if (sheetName) return sheetName;
  }
  const defensivePlaybook = game.opponent_scheme?.trim();
  if (defensivePlaybook) return defensivePlaybook;
  return "None";
}

type FilmRoomPageProps = {
  searchParams: Promise<{ version?: string }>;
};

export default async function FilmRoomPage({ searchParams }: FilmRoomPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/landing?next=${encodeURIComponent("/film")}`);

  const { version: versionRaw } = await searchParams;
  const versionFilter = parseFilmRoomVersionFilter(versionRaw);
  const games = (
    await getGamesWithCounts(user.id, versionFilter)
  ).filter((game) => gameMatchesFilmRoomVersionFilter(game.game_version, versionFilter));
  const newGameHref = filmRoomNewGameHref(versionFilter);

  return (
    <div className="flex min-h-[60vh] flex-col gap-6 md:gap-8">
      <FilmRoomHomeHeader gameCount={games.length} newGameHref={newGameHref} />

      <div className={appShellWorkspaceInnerClass}>
        <Suspense fallback={null}>
          <FilmRoomVersionFilter className="mb-4" />
        </Suspense>

        {games.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="font-body text-base font-medium text-white">{FILM_ROOM_EMPTY_HEADLINE}</p>
            <p className="mt-1 font-body text-sm text-slate-400">{FILM_ROOM_EMPTY_BODY}</p>
            <Button asChild variant="default" className="mt-4 text-sm">
              <Link href={newGameHref}>{FILM_ROOM_EMPTY_CTA}</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {games.map((game) => (
              <li key={game.id} className="relative">
                <FilmGameCard game={game} defenseLabel={game.defenseLabel} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <FilmRoomOnboarding />
    </div>
  );
}
