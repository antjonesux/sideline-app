#!/usr/bin/env node
import { extractPlayArtDocx } from "./extract-docx";
import { buildComparisonFingerprint, similarityScore } from "./image-similarity";
import { fetchReferenceImage } from "./reference-image";
import {
  collectFormationCrops,
  formationTypesFromSeed,
  loadSeedForReference,
} from "./match-play-art";
import { loadPlayArtReference } from "./reference";
import { normalizePlayName } from "../../lib/utils";

async function scoreCropAgainstPlays(
  formation: string,
  cropId: string,
): Promise<void> {
  const ref = loadPlayArtReference("scripts/play-art/references/cfb27-offense-air-force.json");
  const extracted = await extractPlayArtDocx(
    "scripts/play-art/source/Option & Spread Option/Air Force.docx",
    ref,
  );
  const seed = await loadSeedForReference(ref);
  const formationType = formationTypesFromSeed(seed).get(formation) ?? "";
  const refFormation = ref.formations.find((f) => f.name === formation);
  const crops = collectFormationCrops(ref, extracted).get(formation) ?? [];
  const crop = crops.find((c) => c.cropId === cropId);
  if (!crop || !refFormation) {
    console.error("Missing crop or formation");
    process.exit(1);
  }

  const cropBuf = extracted.mediaFiles.get(crop.mediaPath);
  if (!cropBuf) process.exit(1);
  const cropFp = await buildComparisonFingerprint(cropBuf);

  const scores: Array<{ play: string; score: number }> = [];
  for (const playName of refFormation.plays) {
    const refImg = await fetchReferenceImage(ref, { formation, formationType, playName });
    const refFp = await buildComparisonFingerprint(refImg.buffer);
    scores.push({ play: normalizePlayName(playName), score: similarityScore(cropFp, refFp) });
  }
  scores.sort((a, b) => b.score - a.score);
  console.log(`${formation} / ${cropId} — top matches:`);
  for (const row of scores.slice(0, 5)) {
    console.log(`  ${row.score.toFixed(4)}  ${row.play}`);
  }
}

const formation = process.argv[2] ?? "Flexbone Normal";
const cropId = process.argv[3] ?? "source-2:right";

scoreCropAgainstPlays(formation, cropId).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
