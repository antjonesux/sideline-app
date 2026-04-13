/**
 * Re-seeds team_offensive_playbooks and team_defensive_schemes from seed-team-schemes.sql.
 *
 * The Supabase JS client cannot run arbitrary SQL (TRUNCATE) with the service role alone,
 * so this script parses the INSERT rows from the SQL file and applies them via PostgREST.
 *
 * Env (e.g. sideline/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * To run the .sql file literally against Postgres instead, use (from sideline/):
 *   psql "$SUPABASE_DATABASE_URL" -f supabase/seed-team-schemes.sql
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

type OffensiveRow = { team_name: string; playbook_name: string; scheme_style: string };
type DefensiveRow = { team_name: string; defensive_scheme: string };

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

function parseOffensive(sql: string): OffensiveRow[] {
  const inner = extractInsertBlock(sql, "team_offensive_playbooks");
  const re = /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
  const rows: OffensiveRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    rows.push({ team_name: m[1], playbook_name: m[2], scheme_style: m[3] });
  }
  if (rows.length === 0) throw new Error("No offensive rows parsed from SQL");
  return rows;
}

function parseDefensive(sql: string): DefensiveRow[] {
  const inner = extractInsertBlock(sql, "team_defensive_schemes");
  const re = /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
  const rows: DefensiveRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    rows.push({ team_name: m[1], defensive_scheme: m[2] });
  }
  if (rows.length === 0) throw new Error("No defensive rows parsed from SQL");
  return rows;
}

async function clearTable(
  supabase: ReturnType<typeof createClient>,
  table: "team_offensive_playbooks" | "team_defensive_schemes",
) {
  const { error } = await supabase.from(table).delete().neq("team_name", "");
  if (error) throw new Error(`${table} delete: ${error.message}`);
}

async function insertBatches<T extends Record<string, string>>(
  supabase: ReturnType<typeof createClient>,
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

async function countRows(
  supabase: ReturnType<typeof createClient>,
  table: "team_offensive_playbooks" | "team_defensive_schemes",
): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
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

  const sqlPath = join(__dirname, "seed-team-schemes.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const offensive = parseOffensive(sql);
  const defensive = parseDefensive(sql);
  if (offensive.length !== defensive.length) {
    throw new Error(`Row count mismatch: offense ${offensive.length}, defense ${defensive.length}`);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("Clearing tables…");
  await clearTable(supabase, "team_offensive_playbooks");
  await clearTable(supabase, "team_defensive_schemes");

  console.log(`Inserting ${offensive.length} offensive and ${defensive.length} defensive rows…`);
  await insertBatches(supabase, "team_offensive_playbooks", offensive, 80);
  await insertBatches(supabase, "team_defensive_schemes", defensive, 80);

  const co = await countRows(supabase, "team_offensive_playbooks");
  const cd = await countRows(supabase, "team_defensive_schemes");
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
