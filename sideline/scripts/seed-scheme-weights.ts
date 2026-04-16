/**
 * Seeds generic scheme_play_weights archetypes for (scheme, play_type) pairs that do not exist yet.
 * Idempotent: never overwrites existing rows (preserves real team data like Washington State Power Spread).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Usage: npm run seed:scheme-weights
 */

import { createClient } from "@supabase/supabase-js";
import { ALL_SCHEMES } from "../lib/playbooks/scheme-classifications";
import { SCHEME_ARCHETYPE_WEIGHTS } from "../lib/seed/scheme-weights-archetypes";
import { requireServiceSupabase } from "./_seedEnv";

function assertArchetypesComplete() {
  for (const scheme of ALL_SCHEMES) {
    const rows = SCHEME_ARCHETYPE_WEIGHTS[scheme];
    if (!rows || rows.length !== 10) {
      throw new Error(`SCHEME_ARCHETYPE_WEIGHTS missing or wrong count for ${scheme}`);
    }
    for (const r of rows) {
      if (r.weight < 0 || r.weight > 1) {
        throw new Error(`Invalid weight for ${scheme} / ${r.playType}: ${r.weight}`);
      }
    }
  }
}

async function main() {
  assertArchetypesComplete();
  const { url, key } = requireServiceSupabase();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let inserted = 0;
  let skipped = 0;

  for (const scheme of ALL_SCHEMES) {
    const weights = SCHEME_ARCHETYPE_WEIGHTS[scheme];
    for (const { playType, weight } of weights) {
      const { data: existing, error: selErr } = await supabase
        .from("scheme_play_weights")
        .select("id")
        .eq("scheme", scheme)
        .eq("play_type", playType)
        .maybeSingle();

      if (selErr) {
        console.error("Lookup failed:", selErr.message);
        process.exit(1);
      }

      if (existing) {
        skipped += 1;
        continue;
      }

      const { error: insErr } = await supabase.from("scheme_play_weights").insert({
        scheme,
        play_type: playType,
        weight,
        suppress: false,
      });

      if (insErr) {
        console.error("Insert failed:", insErr.message);
        process.exit(1);
      }
      inserted += 1;
    }
  }

  console.log(
    `scheme_play_weights: inserted ${inserted.toLocaleString("en-US")} archetype row(s); skipped ${skipped.toLocaleString("en-US")} existing (scheme + play_type).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
