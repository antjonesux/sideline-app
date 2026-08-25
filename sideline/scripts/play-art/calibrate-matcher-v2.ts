#!/usr/bin/env node
/**
 * Calibrate Matcher V2 signals on USC verified pairs (correct vs incorrect).
 *
 * Usage (from sideline/):
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/calibrate-matcher-v2.ts
 */
import { extractPlayArtDocx } from "./extract-docx";
import {
  normalizeDiagramRaster,
  prepareReferenceSet,
  registerRaster,
  scoreAlignedOwnedAgainstReference,
} from "./image-similarity-v2";
import { collectFormationCrops, formationTypesFromSeed, loadSeedForReference } from "./match-play-art";
import { mapPlayArtPositionally } from "./map-positional";
import { loadPlayArtReference } from "./reference";
import { fetchReferenceImagesForFormation } from "./reference-image";

function summarize(label: string, values: number[]): void {
  if (values.length === 0) {
    console.log(`${label}: (none)`);
    return;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  console.log(
    `${label}: n=${values.length} avg=${avg.toFixed(3)} p10=${p10.toFixed(3)} med=${p50.toFixed(3)} p90=${p90.toFixed(3)}`,
  );
}

async function main(): Promise<void> {
  const ref = loadPlayArtReference("scripts/play-art/references/cfb27-offense-usc.json");
  const extracted = await extractPlayArtDocx(
    "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
    ref,
  );
  const seed = await loadSeedForReference(ref);
  const types = formationTypesFromSeed(seed);
  const cropsByFormation = collectFormationCrops(ref, extracted);
  const positional = mapPlayArtPositionally(ref, extracted);

  const correctComposite: number[] = [];
  const incorrectComposite: number[] = [];
  const correctMargin: number[] = [];
  const correctResidual: number[] = [];
  const incorrectResidual: number[] = [];

  // Sample up to 8 formations for calibration speed.
  const formations = ref.formations.slice(0, 8);

  for (const formation of formations) {
    const formationType = types.get(formation.name);
    if (!formationType) continue;
    const crops = cropsByFormation.get(formation.name) ?? [];
    const playNames = formation.plays;
    const fetched = await fetchReferenceImagesForFormation(
      ref,
      formation.name,
      formationType,
      playNames,
    );
    if (fetched.images.length !== playNames.length) continue;

    const refRasters = [];
    for (const image of fetched.images) {
      refRasters.push(await normalizeDiagramRaster(image.buffer));
    }
    const { baseline, prepared } = prepareReferenceSet(refRasters);

    const posRows = positional.mapped.filter((m) => m.formation === formation.name);

    for (let i = 0; i < crops.length; i += 1) {
      const crop = crops[i];
      const buf = extracted.mediaFiles.get(crop.mediaPath);
      if (!buf) continue;
      const owned = await normalizeDiagramRaster(buf);
      const { aligned, registration } = registerRaster(owned, baseline);
      const correctPlay = posRows.find((p) => p.blockIndex === crop.blockIndex)?.playName;
      if (!correctPlay) continue;
      const correctIdx = playNames.findIndex(
        (p) => p.toUpperCase() === correctPlay.toUpperCase(),
      );
      if (correctIdx < 0) continue;

      const scores = prepared.map((p) =>
        scoreAlignedOwnedAgainstReference(aligned, p, baseline, registration),
      );
      const correctScore = scores[correctIdx].composite;
      correctComposite.push(correctScore);
      correctResidual.push(scores[correctIdx].signals.residual);

      let bestIncorrect = -1;
      for (let j = 0; j < scores.length; j += 1) {
        if (j === correctIdx) continue;
        incorrectComposite.push(scores[j].composite);
        incorrectResidual.push(scores[j].signals.residual);
        if (scores[j].composite > bestIncorrect) bestIncorrect = scores[j].composite;
      }
      correctMargin.push(correctScore - bestIncorrect);
    }

    console.log(`Calibrated formation: ${formation.name} (${crops.length} plays)`);
  }

  console.log("");
  summarize("CORRECT composite", correctComposite);
  summarize("INCORRECT composite", incorrectComposite);
  summarize("CORRECT residual", correctResidual);
  summarize("INCORRECT residual", incorrectResidual);
  summarize("CORRECT margin vs best-incorrect", correctMargin);

  const sep =
    correctComposite.length && incorrectComposite.length
      ? Math.min(...correctComposite) - Math.max(...incorrectComposite.filter((_, i) => i < 50))
      : 0;
  console.log(`\nRough separation hint (min-correct - sample-max-incorrect): ${sep.toFixed(3)}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
