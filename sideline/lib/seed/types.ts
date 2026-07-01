export interface PlaySeed {
  playName: string;
  isNewIn26: boolean;
  /** True when the play is new in CFB27 (seed metadata; optional for CFB26-only seeds). */
  isNewIn27?: boolean;
  playType?: string;
}

export interface FormationSeed {
  formation: string;
  formationType: string;
  plays: PlaySeed[];
}

export interface TeamPlaybookSeed {
  team: string;
  scheme: string;
  sideOfBall: "offense" | "defense";
  /** Catalog game version; defaults to `cfb26` when omitted (existing seed files). */
  gameVersion?: "cfb26" | "cfb27";
  source: {
    url: string;
    verified: string;
  };
  formations: FormationSeed[];
}
