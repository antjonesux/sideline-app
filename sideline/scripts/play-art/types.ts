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
  /** SHA-256 of final play-card bytes; empty until content-hash assignment. */
  assetId: string;
  /** Public path under `/play-art/{version}/assets/{assetId}.{ext}`. */
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
  /** SHA-256 content hash of the published play-card bytes. */
  asset_id: string;
  /** Public path; multiple logical mappings may share one path. */
  asset_path: string;
};

export type PlayArtSourceDiscoveryStatus =
  | "MATCH"
  | "ALIAS"
  | "UNRESOLVED"
  | "AMBIGUOUS";

export type PlayArtSourceDiscoveryResult = {
  sourcePath: string;
  fileName: string;
  basename: string;
  status: PlayArtSourceDiscoveryStatus;
  resolvedSeed?: string;
  resolvedPlaybook?: string;
  candidates?: string[];
  aliasTarget?: string;
};
