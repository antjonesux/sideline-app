/** Diagnostic OBS → play-art source preparation types. Not part of publish pipeline. */

export type VideoSideOfBall = "offense" | "defense";

export type ParsedVideoFilename = {
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  basename: string;
};

export type ResolvedVideoSource = {
  videoPath: string;
  basename: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  playbookDisplayName: string;
  seedSlug: string;
  seedPath: string;
  directorySide: VideoSideOfBall | null;
};

export type CardPosition = "left" | "middle" | "right";

/** Normalized rectangle in [0,1] relative to frame width/height. */
export type NormRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VideoCropProfile = {
  id: string;
  frameWidth: number;
  frameHeight: number;
  contentBand: NormRect;
  /** Top formation-nav strip (corroboration only). */
  navBand: NormRect;
  cards: {
    left: NormRect;
    middle: NormRect;
    right: NormRect;
  };
  cardHeaderHeightFrac: number;
  cardArt: NormRect;
};

export type RejectReason =
  | "TRANSITION_FRAME"
  | "FORMATION_DISAGREEMENT"
  | "KEY_PLAYERS_SCREEN"
  | "LOW_STABILITY"
  | "DUPLICATE_SCREEN"
  | "NO_VALID_CARDS"
  | "CHROME_NOISE"
  | "LOW_SHARPNESS";

export type StableScreen = {
  screenIndex: number;
  timestampSec: number;
  timestampLabel: string;
  samplePath: string;
  framePath: string;
  stableDurationSec: number;
  /** True when dwell was under the prior 0.5s gate (short-hold recovery). */
  shortHold: boolean;
  fingerprintHash: string;
  sharpnessScore: number;
  localMotionScore: number;
};

export type RejectedCandidate = {
  timestampSec: number;
  timestampLabel: string;
  fingerprintHash: string;
  reason: RejectReason;
  stableDurationSec: number;
  shortHold: boolean;
  formationOcr: string[];
  playOcr: string[];
  notes?: string;
};

export type CardSourceType = "video" | "manual-supplement";

export type SupplementCardClass =
  | "NEW_MISSING_PLAY"
  | "DUPLICATE_EXISTING"
  | "OCR_UNRESOLVED"
  | "CATALOG_MISMATCH"
  | "INVALID_SCREEN"
  | "EMPTY_SLOT";

export type ExtractedVideoCard = {
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  videoFile: string;
  timestamp: string;
  timestampSec: number;
  screenIndex: number;
  cardPosition: CardPosition;
  sourceCardPath: string;
  artCropPath: string;
  emptySlot: boolean;
  formationOcrRaw: string;
  formationOcr: string;
  playNameOcrRaw: string | null;
  playNameOcr: string | null;
  matchedFormation: string | null;
  formationMatchConfidence: "exact" | "fuzzy" | "none";
  matchedPlay: string | null;
  playMatchConfidence: "exact" | "fuzzy" | "none" | "skipped";
  catalogValid: boolean;
  screenRejected: boolean;
  rejectReason: RejectReason | null;
  /** Provenance: video frame vs manual screenshot. Defaults to video for older reports. */
  sourceType?: CardSourceType;
  /** Basename of video file or screenshot file. */
  sourceFile?: string;
  /** Manual-supplement classification (per card). */
  supplementClass?: SupplementCardClass;
};

export type FormationCoverageStatus =
  | "COMPLETE"
  | "INCOMPLETE"
  | "OCR_REVIEW"
  | "STRUCTURAL_REVIEW";

export type FormationCoverageRow = {
  formation: string;
  expectedPlays: number;
  detectedCardCount: number;
  emptySlotCount: number;
  catalogValidUniquePlays: number;
  unresolvedCardCount: number;
  missingCatalogPlayCount: number;
  unexpectedOcrCount: number;
  coveragePct: number;
  status: FormationCoverageStatus;
  missingPlays: string[];
  unexpectedPlays: string[];
};

export type RecaptureFormation = {
  formation: string;
  expected: number;
  detected: number;
  missingPlays: string[];
  status: FormationCoverageStatus;
};

export type RecaptureQueue = {
  playbook: string;
  gameVersion: string;
  side: VideoSideOfBall;
  formationsToRecapture: RecaptureFormation[];
};

export type VideoCatalogCompare = {
  expectedFormations: string[];
  detectedFormations: string[];
  missingFormations: string[];
  unexpectedFormations: string[];
  expectedPlayCount: number;
  detectedUniquePlays: number;
  missingCatalogPlays: Array<{ formation: string; play: string }>;
  unexpectedDetectedPlays: Array<{ formationOcr: string; playOcr: string }>;
};

export type MissBreakdown = {
  /** Catalog plays with no observed catalog-valid card (includes all below). */
  missingCatalogPlays: number;
  /** Missing plays attributable to under-capture (not enough cards seen for formation). */
  notCaptured: number;
  /** Cards present for formation but play OCR unresolved. */
  capturedButOcrUnresolved: number;
  /** Candidate screens rejected as transitions/chrome. */
  capturedButRejected: number;
  /** OCR text that did not map into this playbook namespace. */
  catalogMismatch: number;
};

export type VideoPrepareReport = {
  videoFile: string;
  videoPath: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbook: string;
  playbookSlug: string;
  seedSlug: string;
  durationSec: number;
  frameWidth: number;
  frameHeight: number;
  cropProfileId: string;

  framesSampled: number;
  candidateScreens: number;
  acceptedPlayScreens: number;
  rejectedTransitionScreens: number;
  shortHoldScreensRecovered: number;
  duplicateScreensRemoved: number;

  playCardsExtracted: number;
  validCardCandidates: number;
  emptySlots: number;
  duplicateCards: number;

  uniqueFormationsDetected: number;
  completeFormations: number;
  incompleteFormations: number;
  formationCoveragePct: number;

  ocrFormationMatches: number;
  ocrPlayNameMatches: number;
  catalogValidIdentities: number;
  unresolvedIdentities: number;

  catalog: VideoCatalogCompare;
  formationCoverage: FormationCoverageRow[];
  recaptureQueue: RecaptureQueue;
  missBreakdown: MissBreakdown;
  rejectedCandidates: RejectedCandidate[];
  cards: ExtractedVideoCard[];

  /** Baseline from first diagnostic (hardcoded for go-go comparison). */
  beforeAfter?: {
    before: {
      stableScreens: number;
      catalogValidPlays: number;
      expectedPlays: number;
      coveragePct: number;
      missing: number;
    };
    after: {
      stableScreens: number;
      catalogValidPlays: number;
      expectedPlays: number;
      coveragePct: number;
      missing: number;
    };
    delta: {
      screensRecovered: number;
      playsRecovered: number;
      missingReduced: number;
    };
  };

  recommendation:
    | "READY FOR PIPELINE INTEGRATION"
    | "NEEDS EXTRACTION TUNING"
    | "NEEDS OCR TUNING"
    | "VIDEO WORKFLOW NOT RELIABLE ENOUGH";
  notes: string[];
};
