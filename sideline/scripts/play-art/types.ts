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

/** Stable crop identifier within a formation (e.g. source-22:left). */
export type FormationCropId = string;

export type FormationOwnedCrop = {
  cropId: FormationCropId;
  mediaPath: string;
  extension: string;
  blockIndex: number;
  sourceIndex: number;
  cardPosition: "left" | "middle" | "right";
  /** 1-based order within formation (debug only; not canonical identity). */
  sourceOrder: number;
};

export type MatchConfidenceStatus = "PASS" | "REVIEW" | "FAIL";

export type MatchMethod =
  | "trusted-hash"
  | "normalized-exact"
  | "visual-v2"
  | "visual-v3"
  | "geometry-v3.1"
  | "geometry-v3.2"
  | "operator-override"
  /** Vault flip / duplicate card; not published as a second play mapping. */
  | "duplicate-omit";

export type MatchSignals = {
  residual: number;
  edges: number;
  foreground: number;
  registered: number;
  /** V3: saturated color-ink overlap (routes/arrows). */
  colorInk?: number;
  /** V3: left/right spatial occupancy agreement. */
  spatial?: number;
};

export type GeometryMatchSignals = {
  spatial: number;
  occupancy: number;
  directional: number;
  components: number;
  topology: number;
  endpoints: number;
  orientation: number;
  perHueSpatial?: number;
  perHueOccupancy?: number;
  perHueByChannel?: { warm: number; cool: number; other: number };
};

export type GeometryMatchDiagnostics = {
  status: "geometry-pass" | "geometry-review" | "geometry-fail";
  score: number;
  runnerUpPlay: string | null;
  runnerUpScore: number | null;
  margin: number | null;
  signals: GeometryMatchSignals | null;
  conflictWithV3: boolean;
  reason: string;
  /** V3 composite retained for QA agreement/disagreement. */
  v3Score: number;
  v3Margin: number | null;
  v3RunnerUpPlay: string | null;
  /** V3.2 per-hue margins (chosen vs runner-up). */
  perHueMargins?: { warm: number; cool: number; other: number } | null;
  maxPerHueMargin?: number | null;
  maxPerHueChannel?: "warm" | "cool" | "other" | null;
  /** True when per-hue evidence unlocked the thinner confirm margin. */
  perHuePromoted?: boolean;
};

export type RegistrationDiagnostics = {
  translationX: number;
  translationY: number;
  scale: number;
  quality: number;
  failed: boolean;
};

export type PlayArtMatchAssignment = {
  formation: string;
  cropId: FormationCropId;
  playName: string;
  mediaPath: string;
  extension: string;
  blockIndex: number;
  sourceIndex: number;
  cardPosition: "left" | "middle" | "right";
  sourceOrder: number;
  /** Composite similarity score (V2) or legacy RMSE similarity (V1 reports). */
  similarity: number;
  runnerUpPlay: string | null;
  runnerUpSimilarity: number | null;
  margin: number | null;
  status: MatchConfidenceStatus;
  overridden: boolean;
  matchMethod: MatchMethod;
  signals: MatchSignals | null;
  registration: RegistrationDiagnostics | null;
  /** True when assigned play is also the local best composite candidate. */
  isLocalBest: boolean;
  referenceUrl: string;
  /** Positional reference play at the same source order (debug). */
  positionalPlayName: string | null;
  /** V3.1 geometry resolver diagnostics (REVIEW cases / geometry promotions). */
  geometry: GeometryMatchDiagnostics | null;
};

export type FormationMatchReport = {
  formation: string;
  expectedPlays: number;
  cropCount: number;
  assignments: PlayArtMatchAssignment[];
  status: "pass" | "fail" | "review";
  errors: string[];
};

export type PlayArtMatchingReport = {
  playbook: string;
  gameVersion: string;
  sideOfBall: string;
  matcherVersion: "v1" | "v2" | "v3" | "v3.1" | "v3.2";
  status: "pass" | "fail" | "review";
  formationCount: number;
  playCount: number;
  passCount: number;
  reviewCount: number;
  failCount: number;
  overrideCount: number;
  autoMatchRate: number;
  methodCounts: Record<MatchMethod, number>;
  averageMargin: number | null;
  medianMargin: number | null;
  negativeMarginPassCount: number;
  nearZeroMarginPassCount: number;
  /** V3.1+: REVIEW cases promoted by geometry resolver. */
  geometryPromotedCount: number;
  /** V3.1+: V3 vs geometry strong-preference conflicts (remain REVIEW). */
  geometryConflictCount: number;
  /** V3.2: promotions unlocked by per-hue margin boost. */
  perHuePromotedCount?: number;
  formations: FormationMatchReport[];
  errors: string[];
  thresholds: {
    passMinScore: number;
    passMinMargin: number;
    reviewMinScore: number;
    failMaxScore: number;
    registrationMinQuality: number;
    signalAgreementMin: number;
  };
  compositeWeights: {
    residual: number;
    edges: number;
    foreground: number;
    registered: number;
    colorInk?: number;
    spatial?: number;
  };
  geometryWeights?: {
    spatialGrid: number;
    occupancy: number;
    directional: number;
    components: number;
    topology: number;
    endpoints: number;
    perHueSpatial?: number;
    perHueOccupancy?: number;
  };
  geometryThresholds?: {
    passMinScore: number;
    passMinMargin: number;
    confirmMinScore?: number;
    confirmMinMargin?: number;
    confirmMinMarginWithPerHue?: number;
    perHueConfirmMinMargin?: number;
    confirmV3MinMargin?: number;
    orientationMin: number;
    spatialMin: number;
  };
};
