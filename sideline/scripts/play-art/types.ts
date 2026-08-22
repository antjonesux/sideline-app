/** Canonical ordered formation/play reference for positional play-art mapping. */
export type PlayArtReferenceFormation = {
  name: string;
  plays: string[];
};

export type PlayArtReference = {
  gameVersion: "cfb26" | "cfb27";
  sideOfBall: "offense" | "defense";
  playbook: string;
  formations: PlayArtReferenceFormation[];
};

export type ClassifiedDocxBlock =
  | { kind: "formation_header"; index: number }
  | { kind: "play_card"; index: number; mediaPath: string; extension: string };

export type ExtractedPlayArtDoc = {
  docxPath: string;
  blocks: ClassifiedDocxBlock[];
  mediaFiles: Map<string, Buffer>;
};

export type MappedPlayArt = {
  formation: string;
  playName: string;
  mediaPath: string;
  extension: string;
  assetPath: string;
  blockIndex: number;
};

export type FormationValidationResult = {
  formation: string;
  expectedPlays: number;
  extractedPlays: number;
  status: "pass" | "fail";
  message?: string;
};

export type PlayArtValidationReport = {
  playbook: string;
  status: "pass" | "fail";
  expectedFormations: number;
  extractedFormationHeaders: number;
  extractedPlayCards: number;
  formations: FormationValidationResult[];
  errors: string[];
};

export type PlayArtManifestRecord = {
  game_version: string;
  side_of_ball: string;
  playbook: string;
  formation: string;
  play_name: string;
  asset_path: string;
};
