import { normalizePlayName } from "../../lib/utils";
import type {
  ClassifiedDocxBlock,
  ExtractedPlayArtDoc,
  MappedPlayArt,
  PlayArtReference,
} from "./types";

type PositionalMapResult = {
  mapped: MappedPlayArt[];
  formationHeaders: number;
  playCards: number;
};

/**
 * Map extracted DOCX blocks to reference formations/plays by document order.
 * Never shifts or recovers from count mismatches — caller must validate first.
 * Asset identity/path are assigned later via content hashing of final card bytes.
 */
export function mapPlayArtPositionally(
  reference: PlayArtReference,
  extracted: ExtractedPlayArtDoc,
): PositionalMapResult {
  const headers = extracted.blocks.filter(
    (b): b is ExtractedPlayArtDoc["blocks"][number] & { kind: "formation_header" } =>
      b.kind === "formation_header",
  );
  const playCards = extracted.blocks.filter(
    (b): b is ClassifiedDocxBlock & { kind: "play_card" } => b.kind === "play_card",
  );

  const mapped: MappedPlayArt[] = [];
  let formationIndex = 0;
  let playIndexInFormation = 0;

  for (const block of extracted.blocks) {
    if (block.kind === "formation_header") {
      if (formationIndex >= reference.formations.length) {
        throw new Error(
          `Positional mapping failed: extra formation header at block ${block.index} ` +
            `(reference has ${reference.formations.length} formations)`,
        );
      }
      playIndexInFormation = 0;
      formationIndex += 1;
      continue;
    }

    const refFormation = reference.formations[formationIndex - 1];
    if (!refFormation) {
      throw new Error(
        `Positional mapping failed: play card at block ${block.index} appears before any formation header`,
      );
    }
    const playName = refFormation.plays[playIndexInFormation];
    if (!playName) {
      throw new Error(
        `Positional mapping failed: extra play card for formation "${refFormation.name}" ` +
          `at block ${block.index} (expected ${refFormation.plays.length} plays)`,
      );
    }

    mapped.push({
      formation: refFormation.name,
      playName: normalizePlayName(playName),
      mediaPath: block.mediaPath,
      extension: block.extension,
      assetId: "",
      assetPath: "",
      blockIndex: block.index,
    });
    playIndexInFormation += 1;
  }

  return {
    mapped,
    formationHeaders: headers.length,
    playCards: playCards.length,
  };
}
