/** Tokens used by field_position_rules and coverage_play_affinities matching. */
export function inferPlayCategories(p: {
  formation: string;
  play_name: string;
  play_type: string | null | undefined;
}): string[] {
  const form = (p.formation ?? "").toLowerCase();
  const name = (p.play_name ?? "").toLowerCase();
  const pt = (p.play_type ?? "").toLowerCase();
  const blob = `${form} ${name} ${pt}`;
  const tags = new Set<string>();

  if (/\bempty\b/.test(form)) tags.add("empty_formation");
  if (/(trips|spread|bunch|doubles)/.test(form) && !tags.has("empty_formation"))
    tags.add("spread");

  if (pt.includes("rpo") || /\brpo\b|read option/.test(blob)) tags.add("rpo");
  if (pt.includes("screen") || /\bscreen\b/.test(name)) tags.add("screen");
  if (pt.includes("run") || /\b(hb |qb )(zone|power|dive|stretch|split)|inside zone|mtn hb|qb zone|qb g\b|iso\b/.test(blob))
    tags.add("run");
  if (pt.includes("play action") || /\bpa |play action|mtn pa\b/.test(blob))
    tags.add("play_action");

  if (
    /\b(deep|seam|vertical|shot|post|four verts|levels seam|go\b|fade\b)/.test(name) ||
    /\bdeep\b/.test(name)
  )
    tags.add("deep_shot");
  if (/\bslant\b/.test(blob)) tags.add("slant");
  if (/\b(stick|hitch|under|bubble|quick out|shallow|flat)\b/.test(blob)) {
    tags.add("quick_game");
    tags.add("short_game");
  }
  if (/\bmesh\b|\blevels\b/.test(name)) {
    tags.add("mesh_levels");
    tags.add("curl_flat");
  }
  if (/\bcurl\b|\bflat\b/.test(name) && /\b(levels|mesh|switch)\b/.test(name))
    tags.add("curl_flat");
  if (/\bcurl|dig|out\b|corner|back shoulder|compressed/.test(blob))
    tags.add("compressed_route");
  if (/\bpower|dive|sneak|qb power|goal line|mtn hb power/.test(blob))
    tags.add("power_run");
  if (/\bsneak\b/.test(name)) tags.add("qb_sneak");
  if (/\bboot|naked|waggle/.test(blob)) tags.add("play_action_boot");
  if (/\bvert|all go|four vertical/.test(blob)) tags.add("all_go");
  if (/\bcross|drive|daggers|in\b|seam\b/.test(name)) {
    tags.add("crosser");
    if (/\bseam\b/.test(name)) tags.add("seam");
  }
  if (/\bdig\b/.test(name)) tags.add("dig");
  if (/\bcorner\b/.test(name)) tags.add("corner");
  if (/\bflat\b/.test(name)) tags.add("flat_route");
  if (/\bshort_flat\b/.test(name) || /^stick$/i.test(p.play_name.trim()))
    tags.add("short_flat");
  if (/\bslot|wr2|te cross|hb angle|y cross/.test(blob)) tags.add("wr2_te_hb");
  if (/\bflea|reverse|double pass|trick/.test(blob)) tags.add("trick_play");

  if (tags.has("deep_shot") || tags.has("rpo")) tags.add("explosive");
  if (tags.has("quick_game") || /\bcurl|stick|hitch/.test(blob))
    tags.add("high_pct_pass");
  if (/\bscreen\b/.test(name) && /wr|bubble/.test(blob))
    tags.add("negative_screen");

  if (/\b(slant|stick|hitch|hot)\b/.test(blob)) tags.add("hot_route");
  if (/\b(seven|7-step)|long developing/.test(blob)) tags.add("seven_step");
  if (/\b(post|four verts|shot play)/.test(blob)) tags.add("deep_post");
  if (/\brub|pick|mesh/.test(blob)) tags.add("rub");
  if (/\bmotion\b/.test(blob)) tags.add("motion");
  if (/\biso\b|single receiver/.test(blob)) tags.add("iso_wr");
  if (/\bstreak|go route|fade go/.test(blob)) tags.add("boundary_streak");
  if (/\bmiddle|mofo|hi-lo/.test(blob)) tags.add("middle_field");

  if (/\b(balanced|rhythm)/.test(pt)) tags.add("balanced");
  if (!tags.size) tags.add("balanced");

  return Array.from(tags);
}

export function playMatchesToken(categories: string[], token: string): boolean {
  const t = token.toLowerCase();
  return categories.some((c) => c === t || c.includes(t) || t.includes(c));
}
