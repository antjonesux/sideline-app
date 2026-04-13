export type FilmResultTag =
  | "NO_GAIN"
  | "GAIN"
  | "LOSS"
  | "TOUCHDOWN"
  | "INCOMPLETE"
  | "TURNOVER"
  | "PUNT"
  | "FIELD_GOAL";

export const FILM_RESULT_BUTTONS: { tag: FilmResultTag; label: string; color: "slate" | "amber" | "red" | "emerald" }[] = [
  { tag: "NO_GAIN", label: "No Gain", color: "slate" },
  { tag: "GAIN", label: "Gain", color: "amber" },
  { tag: "LOSS", label: "Loss", color: "red" },
  { tag: "TOUCHDOWN", label: "Touchdown", color: "emerald" },
  { tag: "INCOMPLETE", label: "Incomplete", color: "slate" },
  { tag: "TURNOVER", label: "Turnover", color: "red" },
  { tag: "PUNT", label: "Punt", color: "slate" },
  { tag: "FIELD_GOAL", label: "Field Goal", color: "emerald" },
];

export function isFilmResultTag(v: string): v is FilmResultTag {
  return FILM_RESULT_BUTTONS.some((b) => b.tag === v);
}
