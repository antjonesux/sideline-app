#!/usr/bin/env node
/**
 * Operator debug: print play → strip/card → asset mapping for one formation.
 *
 * Usage (from sideline/):
 *   NODE_PATH=./node_modules tsx ./scripts/play-art/debug-formation-map.ts \
 *     --reference scripts/play-art/references/cfb27-offense-usc.json \
 *     --source scripts/play-art/source/cfb27-offense-USC.docx \
 *     --formation "Wildcat U Off Trips"
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPlayArtDocx } from "./extract-docx";
import { mapPlayArtPositionally } from "./map-positional";
import { loadPlayArtReference } from "./reference";
import { buildOwnedPlayArtAssetPath } from "../../lib/playArtUrl";

const __dirname = dirname(fileURLToPath(import.meta.url));

type CliArgs = {
  referencePath: string;
  sourcePath: string;
  formation: string;
  writeCrops: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let referencePath = "";
  let sourcePath = "";
  let formation = "";
  let writeCrops = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--reference" && argv[i + 1]) {
      referencePath = argv[i + 1];
      i += 1;
    } else if ((arg === "--source" || arg === "--docx") && argv[i + 1]) {
      sourcePath = argv[i + 1];
      i += 1;
    } else if (arg === "--formation" && argv[i + 1]) {
      formation = argv[i + 1];
      i += 1;
    } else if (arg === "--write-crops") {
      writeCrops = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: debug-formation-map --reference <path> --source <path> --formation <name> [--write-crops]",
      );
      process.exit(0);
    }
  }

  if (!referencePath || !sourcePath || !formation) {
    console.error("Missing --reference, --source, or --formation");
    process.exit(1);
  }
  if (!existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    process.exit(1);
  }

  return { referencePath, sourcePath, formation, writeCrops };
}

function cardLabel(cardIndex: number): string {
  if (cardIndex === 0) return "left";
  if (cardIndex === 1) return "middle";
  if (cardIndex === 2) return "right";
  return `card${cardIndex}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const reference = loadPlayArtReference(args.referencePath);
  const formationRef = reference.formations.find((f) => f.name === args.formation);
  if (!formationRef) {
    console.error(`Formation not in reference: ${args.formation}`);
    process.exit(1);
  }

  const extracted = await extractPlayArtDocx(args.sourcePath, reference);
  const { mapped } = mapPlayArtPositionally(reference, extracted);
  const rows = mapped.filter((m) => m.formation === args.formation);

  if (rows.length === 0) {
    console.error(`No mapped plays for formation: ${args.formation}`);
    process.exit(1);
  }

  const cropDir = join(__dirname, ".staging", "formation-qa", args.formation.toLowerCase().replace(/\s+/g, "-"));
  if (args.writeCrops) {
    mkdirSync(cropDir, { recursive: true });
  }

  console.log(args.formation);
  console.log(`expected plays: ${formationRef.plays.length} | mapped: ${rows.length}`);
  console.log("");

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const match = /^crop:\/\/(\d+)\/(\d+)\.jpg$/.exec(row.mediaPath);
    const stripIndex = match ? Number(match[1]) : -1;
    const cardIndex = match ? Number(match[2]) : -1;
    const pos = cardLabel(cardIndex);
    const assetPath = buildOwnedPlayArtAssetPath({
      gameVersion: reference.gameVersion,
      sideOfBall: reference.sideOfBall,
      playbook: reference.playbook,
      formation: row.formation,
      playName: row.playName,
      extension: "jpg",
    });

    console.log(
      `${String(i + 1).padStart(2, "0")}  ${row.playName.padEnd(20)}  strip ${stripIndex} / ${pos}  ${assetPath}`,
    );

    if (args.writeCrops) {
      const buf = extracted.mediaFiles.get(row.mediaPath);
      if (buf) {
        const fileName = `${String(i + 1).padStart(2, "0")}-${row.playName.toLowerCase().replace(/\s+/g, "-")}-strip${stripIndex}-${pos}.jpg`;
        writeFileSync(join(cropDir, fileName), buf);
      }
    }
  }

  if (args.writeCrops) {
    console.log(`\nCrops written to ${cropDir}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
