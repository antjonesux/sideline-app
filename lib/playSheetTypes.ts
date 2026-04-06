export interface PlaySheet {
  id: string;
  name: string;
  offensive_scheme_id: string;
  defensive_scheme: string;
  opponent_team: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlaySheetPlay {
  id: string;
  play_sheet_id: string;
  situation: string;
  situation_order: number | null;
  play_order: number | null;
  formation: string;
  play_name: string;
  coaching_note: string | null;
  counter_formation: string | null;
  counter_play: string | null;
  custom_note: string | null;
  is_featured: boolean;
  is_used: boolean;
  created_at?: string;
}

export interface PlaySheetWithPlays extends PlaySheet {
  plays: PlaySheetPlay[];
}

export interface PlaySheetListItem extends PlaySheet {
  play_count: number;
}

/** Client draft row (may omit server id until saved). */
export type DraftPlayRow = Omit<
  PlaySheetPlay,
  "id" | "play_sheet_id" | "created_at"
> & {
  id?: string;
  play_sheet_id?: string;
  clientKey: string;
};

export const DEMO_PLAY_SHEET_ID = "00000003-0000-4000-8000-000000000001";
