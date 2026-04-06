export interface Scheme {
  id: string;
  name: string;
  coach_name: string | null;
  description: string | null;
  tempo: string | null;
  cfb26_playbook: string | null;
  created_at?: string;
}

export interface SchemePlayerType {
  id: string;
  scheme_id: string;
  position: string;
  archetype_label: string;
  key_attributes: string[] | null;
  avoid_note: string | null;
  created_at?: string;
}

export interface SchemeFormation {
  id: string;
  scheme_id: string;
  formation_name: string;
  formation_group: string | null;
  cfb26_playbook: string | null;
  notes: string | null;
  created_at?: string;
}

export interface SituationalCall {
  id: string;
  scheme_id: string;
  situation: string;
  down: number | null;
  distance_min: number | null;
  distance_max: number | null;
  formation: string;
  play_type: string;
  rationale: string;
  priority: number;
  created_at?: string;
}

export interface SchemeDetail extends Scheme {
  scheme_player_types: SchemePlayerType[];
  scheme_formations: SchemeFormation[];
  situational_calls: SituationalCall[];
}
