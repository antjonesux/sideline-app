export interface PlaySeed {
  playName: string;
  isNewIn26: boolean;
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
  source: {
    url: string;
    verified: string;
  };
  formations: FormationSeed[];
}
