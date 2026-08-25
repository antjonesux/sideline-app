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
import sharp from "sharp";

async function main(): Promise<void> {
  const ref = loadPlayArtReference("scripts/play-art/references/cfb27-offense-air-force.json");
  const extracted = await extractPlayArtDocx(
    "scripts/play-art/source/Option & Spread Option/Air Force.docx",
    ref,
  );
  const seed = await loadSeedForReference(ref);
  const types = formationTypesFromSeed(seed);
  const formation = "Flexbone Normal";
  const crops = collectFormationCrops(ref, extracted).get(formation) ?? [];
  const plays = ref.formations.find((f) => f.name === formation)?.plays ?? [];

  const refMeta = await fetchReferenceImage(ref, {
    formation,
    formationType: types.get(formation) ?? "",
    playName: plays[0] ?? "",
  });
  const ownedMeta = await sharp(extracted.mediaFiles.get(crops[0].mediaPath)!).metadata();
  const refDim = await sharp(refMeta.buffer).metadata();
  console.log("Owned crop:", ownedMeta.width, "x", ownedMeta.height);
  console.log("cfb.fan ref:", refDim.width, "x", refDim.height, refMeta.url);

  const targetPlay = process.argv[2] ?? "FB ZONE DIVE";
  const targetCrop = process.argv[3] ?? "source-2:right";
  const refImg = await fetchReferenceImage(ref, {
    formation,
    formationType: types.get(formation) ?? "",
    playName: targetPlay,
  });
  const refFp = await buildComparisonFingerprint(refImg.buffer);

  const scores: Array<{ cropId: string; score: number }> = [];
  for (const crop of crops) {
    const buf = extracted.mediaFiles.get(crop.mediaPath);
    if (!buf) continue;
    const fp = await buildComparisonFingerprint(buf);
    scores.push({ cropId: crop.cropId, score: similarityScore(fp, refFp) });
  }
  scores.sort((a, b) => b.score - a.score);
  console.log(`\nDirect: ${targetCrop} vs "${targetPlay}":`);
  const directCrop = crops.find((c) => c.cropId === targetCrop);
  if (directCrop) {
    const buf = extracted.mediaFiles.get(directCrop.mediaPath)!;
    const fp = await buildComparisonFingerprint(buf);
    console.log(" ", similarityScore(fp, refFp).toFixed(4));
  }

  console.log(`\nScores vs reference "${targetPlay}":`);
  for (const row of scores.slice(0, 8)) {
    console.log(`  ${row.cropId}  ${row.score.toFixed(4)}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
