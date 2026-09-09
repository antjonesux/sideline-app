/**
 * Re-seeds team_offensive_playbooks and team_defensive_schemes.
 *
 * - CFB26: parsed from seed-team-schemes.sql (legacy EA-era styles)
 * - CFB27: from lib/seed/team-styles/cfb27-team-styles.ts (PlaybookGamer Team Styles)
 *
 * Env (e.g. sideline/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run seed:teams
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CFB27_TEAM_STYLES } from "../lib/seed/team-styles/cfb27-team-styles";

const __dirname = dirname(fileURLToPath(import.meta.url));

type OffensiveRow = {
  team_name: string;
  playbook_name: string;
  scheme_style: string;
  game_version: string;
};

type DefensiveRow = {
  team_name: string;
  defensive_scheme: string;
  game_version: string;
};

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

function loadEnv() {
  const cwd = process.cwd();
  for (const p of [
    join(__dirname, "..", ".env.local"),
    join(cwd, ".env.local"),
    join(cwd, "sideline", ".env.local"),
    join(cwd, "..", "sideline", ".env.local"),
  ]) {
    loadEnvFile(p);
  }
}

function extractInsertBlock(sql: string, table: string): string {
  const re = new RegExp(`INSERT INTO ${table}[\\s\\S]+?;`, "m");
  const m = sql.match(re);
  if (!m) throw new Error(`Could not find INSERT INTO ${table} ... ;`);
  const block = m[0];
  const vi = block.indexOf("VALUES");
  if (vi === -1) throw new Error(`VALUES missing in ${table} insert`);
  let inner = block.slice(vi + "VALUES".length).trim();
  if (inner.endsWith(";")) inner = inner.slice(0, -1).trim();
  return inner;
}

function parseCfb26Offensive(sql: string): OffensiveRow[] {
  const inner = extractInsertBlock(sql, "team_offensive_playbooks");
  const re = /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
  const rows: OffensiveRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    rows.push({
      team_name: m[1],
      playbook_name: m[2],
      scheme_style: m[3],
      game_version: "cfb26",
    });
  }
  if (rows.length === 0) throw new Error("No CFB26 offensive rows parsed from SQL");
  return rows;
}

function parseCfb26Defensive(sql: string): DefensiveRow[] {
  const inner = extractInsertBlock(sql, "team_defensive_schemes");
  const re = /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
  const rows: DefensiveRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    rows.push({
      team_name: m[1],
      defensive_scheme: m[2],
      game_version: "cfb26",
    });
  }
  if (rows.length === 0) throw new Error("No CFB26 defensive rows parsed from SQL");
  return rows;
}

function cfb27Offensive(): OffensiveRow[] {
  return CFB27_TEAM_STYLES.map((row) => ({
    team_name: row.team_name,
    playbook_name: row.playbook_name,
    scheme_style: row.scheme_style,
    game_version: "cfb27",
  }));
}

function cfb27Defensive(): DefensiveRow[] {
  return CFB27_TEAM_STYLES.map((row) => ({
    team_name: row.team_name,
    defensive_scheme: row.defensive_scheme,
    game_version: "cfb27",
  }));
}

/** Exact-name mismatches between PlaybookGamer labels and Sideline catalog playbook names. */
function logCfb27NameMappings() {
  console.log("CFB27 team name mappings (PlaybookGamer → Sideline):");
  console.log('  "Miami FL" → "Miami"');
  console.log('  "Miami OH" → "Miami OH" (exact)');
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server-only; never commit).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  async function clearTable(table: "team_offensive_playbooks" | "team_defensive_schemes") {
    const { error } = await supabase.from(table).delete().neq("team_name", "");
    if (error) throw new Error(`${table} delete: ${error.message}`);
  }

  async function insertBatches<T extends Record<string, string>>(
    table: "team_offensive_playbooks" | "team_defensive_schemes",
    rows: T[],
    batchSize: number,
  ) {
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const { error } = await supabase.from(table).insert(chunk as never);
      if (error) throw new Error(`${table} insert at ${i}: ${error.message}`);
    }
  }

  async function countRows(table: "team_offensive_playbooks" | "team_defensive_schemes"): Promise<number> {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table} count: ${error.message}`);
    return count ?? 0;
  }

  const sqlPath = join(__dirname, "seed-team-schemes.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const offensive = [...parseCfb26Offensive(sql), ...cfb27Offensive()];
  const defensive = [...parseCfb26Defensive(sql), ...cfb27Defensive()];

  const cfb27Off = cfb27Offensive();
  const cfb27Def = cfb27Defensive();
  if (cfb27Off.length !== cfb27Def.length) {
    throw new Error(`CFB27 row count mismatch: offense ${cfb27Off.length}, defense ${cfb27Def.length}`);
  }

  logCfb27NameMappings();
  console.log(`CFB26 offense=${parseCfb26Offensive(sql).length} defense=${parseCfb26Defensive(sql).length}`);
  console.log(`CFB27 offense=${cfb27Off.length} defense=${cfb27Def.length}`);

  console.log("Clearing tables…");
  await clearTable("team_offensive_playbooks");
  await clearTable("team_defensive_schemes");

  console.log(`Inserting ${offensive.length} offensive and ${defensive.length} defensive rows…`);
  await insertBatches("team_offensive_playbooks", offensive, 80);
  await insertBatches("team_defensive_schemes", defensive, 80);

  const co = await countRows("team_offensive_playbooks");
  const cd = await countRows("team_defensive_schemes");
  console.log(`Done. team_offensive_playbooks=${co}, team_defensive_schemes=${cd}`);
  if (co !== offensive.length || cd !== defensive.length) {
    console.error("Count mismatch after insert.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
