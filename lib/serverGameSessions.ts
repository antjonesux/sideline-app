import { getSupabase } from "@/lib/supabase";

export type GameSessionRow = {
  id: string;
  play_sheet_id: string;
  offensive_scheme_id: string;
  defensive_scheme: string;
  opponent_team: string | null;
  game_number: number;
  started_at: string;
  ended_at: string | null;
  result: string | null;
  score: string | null;
  what_worked: string | null;
  what_to_adjust: string | null;
  rating: number | null;
};

export type PregameNoteRow = {
  id: string;
  game_session_id: string;
  primary_coverage: string | null;
  blitz_frequency: string | null;
  run_stop_tendency: string | null;
  key_defender: string | null;
  game_plan_focus: string | null;
};

export type TimelineEventRow = {
  id: string;
  game_session_id: string;
  quarter: number | null;
  is_ot: boolean;
  field_zone: string | null;
  down: number | null;
  distance_bucket: string | null;
  score_context: string | null;
  coverage_tags: string[] | null;
  play_called_formation: string | null;
  play_called_name: string | null;
  marked_used: boolean;
  quick_note: string | null;
  event_type: string;
  created_at: string;
};

export async function nextGameNumber(params: {
  play_sheet_id: string;
}): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 1;
  const { data, error } = await supabase
    .from("game_sessions")
    .select("game_number")
    .eq("play_sheet_id", params.play_sheet_id)
    .order("game_number", { ascending: false })
    .limit(1);
  if (error || !data?.length) return 1;
  return (data[0].game_number as number) + 1;
}

export async function createGameSession(input: {
  play_sheet_id: string;
  offensive_scheme_id: string;
  defensive_scheme: string;
  opponent_team?: string | null;
  pregame?: Partial<{
    primary_coverage: string | null;
    blitz_frequency: string | null;
    run_stop_tendency: string | null;
    key_defender: string | null;
    game_plan_focus: string | null;
  }>;
}): Promise<{ session: GameSessionRow; pregame: PregameNoteRow | null } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const game_number = await nextGameNumber({
    play_sheet_id: input.play_sheet_id,
  });

  const { data: session, error: sErr } = await supabase
    .from("game_sessions")
    .insert({
      play_sheet_id: input.play_sheet_id,
      offensive_scheme_id: input.offensive_scheme_id,
      defensive_scheme: input.defensive_scheme,
      opponent_team: input.opponent_team ?? null,
      game_number,
    })
    .select()
    .single();

  if (sErr || !session) return null;

  const sid = session.id as string;
  let pregame: PregameNoteRow | null = null;

  if (input.pregame && Object.keys(input.pregame).length) {
    const { data: pg, error: pErr } = await supabase
      .from("pregame_notes")
      .insert({
        game_session_id: sid,
        primary_coverage: input.pregame.primary_coverage ?? null,
        blitz_frequency: input.pregame.blitz_frequency ?? null,
        run_stop_tendency: input.pregame.run_stop_tendency ?? null,
        key_defender: input.pregame.key_defender ?? null,
        game_plan_focus: input.pregame.game_plan_focus ?? null,
      })
      .select()
      .single();
    if (!pErr && pg) pregame = pg as PregameNoteRow;
  }

  return { session: session as GameSessionRow, pregame };
}

export async function getGameSession(
  id: string,
): Promise<GameSessionRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as GameSessionRow;
}

export async function updateGameSession(
  id: string,
  patch: Partial<
    Pick<
      GameSessionRow,
      | "ended_at"
      | "result"
      | "score"
      | "what_worked"
      | "what_to_adjust"
      | "rating"
    >
  >,
): Promise<GameSessionRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("game_sessions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return null;
  return data as GameSessionRow;
}

export async function upsertPregameForSession(
  sessionId: string,
  body: Partial<{
    primary_coverage: string | null;
    blitz_frequency: string | null;
    run_stop_tendency: string | null;
    key_defender: string | null;
    game_plan_focus: string | null;
  }>,
): Promise<PregameNoteRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("pregame_notes")
    .select("id")
    .eq("game_session_id", sessionId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("pregame_notes")
      .update(body)
      .eq("game_session_id", sessionId)
      .select()
      .single();
    if (error || !data) return null;
    return data as PregameNoteRow;
  }

  const { data, error } = await supabase
    .from("pregame_notes")
    .insert({ game_session_id: sessionId, ...body })
    .select()
    .single();
  if (error || !data) return null;
  return data as PregameNoteRow;
}

export async function getPregameForSession(
  sessionId: string,
): Promise<PregameNoteRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("pregame_notes")
    .select("*")
    .eq("game_session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PregameNoteRow;
}

export async function listTimelineEvents(
  sessionId: string,
): Promise<TimelineEventRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("game_timeline_events")
    .select("*")
    .eq("game_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as TimelineEventRow[];
}

export async function insertTimelineEvent(
  row: Omit<TimelineEventRow, "id" | "created_at">,
): Promise<TimelineEventRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("game_timeline_events")
    .insert({
      game_session_id: row.game_session_id,
      quarter: row.quarter,
      is_ot: row.is_ot,
      field_zone: row.field_zone,
      down: row.down,
      distance_bucket: row.distance_bucket,
      score_context: row.score_context,
      coverage_tags: row.coverage_tags,
      play_called_formation: row.play_called_formation,
      play_called_name: row.play_called_name,
      marked_used: row.marked_used,
      quick_note: row.quick_note,
      event_type: row.event_type,
    })
    .select()
    .single();
  if (error || !data) return null;
  return data as TimelineEventRow;
}

export async function listFieldPositionRules(): Promise<
  import("@/lib/mvp4Types").FieldPositionRuleRow[]
> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("field_position_rules")
    .select("*");
  if (error || !data) return [];
  return data as import("@/lib/mvp4Types").FieldPositionRuleRow[];
}

export async function listCoverageAffinities(): Promise<
  import("@/lib/mvp4Types").CoverageAffinityRow[]
> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("coverage_play_affinities")
    .select("*");
  if (error || !data) return [];
  return data as import("@/lib/mvp4Types").CoverageAffinityRow[];
}

export async function getLatestEndedSessionNotes(params: {
  offensive_scheme_id: string;
  defensive_scheme: string;
}): Promise<{
  what_worked: string | null;
  what_to_adjust: string | null;
  opponent_team: string | null;
  score: string | null;
  result: string | null;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("game_sessions")
    .select("what_worked, what_to_adjust, opponent_team, score, result")
    .eq("offensive_scheme_id", params.offensive_scheme_id)
    .eq("defensive_scheme", params.defensive_scheme)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    what_worked: string | null;
    what_to_adjust: string | null;
    opponent_team: string | null;
    score: string | null;
    result: string | null;
  };
}

export async function aggregateSessionStats(sessionId: string): Promise<{
  playsUsed: number;
  formationCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  zoneCounts: Record<string, number>;
}> {
  const events = await listTimelineEvents(sessionId);
  let playsUsed = 0;
  const formationCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const zoneCounts: Record<string, number> = {};

  for (const e of events) {
    if (e.event_type === "play_used" && e.marked_used) {
      playsUsed += 1;
      if (e.play_called_formation) {
        const f = e.play_called_formation;
        formationCounts[f] = (formationCounts[f] ?? 0) + 1;
      }
    }
    if (e.event_type === "coverage_tag" && e.coverage_tags?.length) {
      for (const t of e.coverage_tags) {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      }
    }
    if (e.field_zone) {
      const z = e.field_zone;
      zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
    }
  }

  return { playsUsed, formationCounts, tagCounts, zoneCounts };
}
