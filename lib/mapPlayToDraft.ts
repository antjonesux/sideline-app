import type { DraftPlayRow, PlaySheetPlay } from "@/lib/playSheetTypes";

export function playSheetPlayToDraft(p: PlaySheetPlay): DraftPlayRow {
  return {
    clientKey: p.id,
    id: p.id,
    situation: p.situation,
    situation_order: p.situation_order,
    play_order: p.play_order,
    formation: p.formation,
    play_name: p.play_name,
    coaching_note: p.coaching_note,
    counter_formation: p.counter_formation,
    counter_play: p.counter_play,
    custom_note: p.custom_note,
    is_featured: p.is_featured,
    is_used: p.is_used,
  };
}

export function draftRowToApiPayload(row: DraftPlayRow) {
  return {
    situation: row.situation,
    situation_order: row.situation_order ?? 0,
    play_order: row.play_order ?? 0,
    formation: row.formation,
    play_name: row.play_name,
    coaching_note: row.coaching_note,
    counter_formation: row.counter_formation,
    counter_play: row.counter_play,
    custom_note: row.custom_note,
    is_featured: row.is_featured,
    is_used: row.is_used,
  };
}
