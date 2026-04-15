"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoggedPlay } from "@/lib/types";
import { FILM_RESULT_BUTTONS, type FilmResultTag, isFilmResultTag } from "@/lib/filmResultTags";

type Side = "OWN" | "OPP";
type Hash = "LEFT" | "MIDDLE" | "RIGHT";

export type PlayLoggerForm = {
  down: number;
  distance: number;
  yard_line: number;
  side: Side;
  hash: Hash;
  formation: string;
  play_name: string;
  result_tag: FilmResultTag | string;
  yards_gained: number;
  note: string;
};

type FormationGroup = { formation_type: string; formations: string[] };

type PlayRow = { play_name: string; is_new_in_26: boolean | null };

type SearchPlayRow = {
  formation: string;
  play_name: string;
  formation_type: string | null;
  is_new_in_26: boolean | null;
};

type SearchFormationGroup = { formation: string; plays: SearchPlayRow[] };

const PLAY_DEFAULT: PlayLoggerForm = {
  down: 1,
  distance: 10,
  yard_line: 0,
  side: "OWN",
  hash: "MIDDLE",
  formation: "",
  play_name: "",
  result_tag: "",
  yards_gained: 0,
  note: "",
};

/** Next down & distance after a logged play; `null` = new drive / drive over → reset to 1st & 10. */
function getNextDownDistance(
  currentDown: number,
  currentDistance: number,
  yardsGained: number,
  resultTag: string,
): { down: number; distance: number } | null {
  if (["TOUCHDOWN", "TURNOVER", "PUNT", "FIELD_GOAL"].includes(resultTag)) return null;

  const yardsToFirst = currentDistance - yardsGained;

  if (yardsToFirst <= 0) {
    return { down: 1, distance: 10 };
  }

  if (currentDown === 4) return null;

  return {
    down: currentDown + 1,
    distance: resultTag === "INCOMPLETE" ? currentDistance : Math.max(1, yardsToFirst),
  };
}

function PlayLoggedToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed top-4 left-1/2 z-[500] -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-900 px-4 py-2.5 shadow-lg">
        <svg
          className="size-4 shrink-0 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium text-emerald-100">Play added to drive</span>
      </div>
    </div>
  );
}

function resultColorClasses(color: (typeof FILM_RESULT_BUTTONS)[number]["color"], active: boolean): string {
  if (active) {
    switch (color) {
      case "slate":
        return "bg-slate-500 text-slate-950";
      case "amber":
        return "bg-amber-500 text-slate-950";
      case "red":
        return "bg-red-500 text-slate-950";
      case "emerald":
        return "bg-emerald-500 text-slate-950";
      default:
        return "bg-emerald-500 text-slate-950";
    }
  }
  return "bg-slate-800 text-slate-300";
}

type PlayLoggerProps = {
  gameSessionId: string;
  myPlaybook: string;
  opponentScheme: string;
  driveId: string;
  editPlay: LoggedPlay | null;
  onClose: () => void;
  onLogged: () => void | Promise<void>;
};

export function PlayLogger({ gameSessionId, myPlaybook, opponentScheme, driveId, editPlay, onClose, onLogged }: PlayLoggerProps) {
  const [play, setPlay] = useState<PlayLoggerForm>(PLAY_DEFAULT);
  const [yardLine, setYardLine] = useState<number | null>(null);
  const [resultTag, setResultTag] = useState<FilmResultTag | null>(null);
  const [yardsInput, setYardsInput] = useState<string>("");
  const [distanceInput, setDistanceInput] = useState<string>("10");
  const [isLogging, setIsLogging] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"formation" | "play">("formation");
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formationGroups, setFormationGroups] = useState<FormationGroup[]>([]);
  const [playRows, setPlayRows] = useState<PlayRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchFormationGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const resetPicker = useCallback(() => {
    setPickerStep("formation");
    setSelectedFormation(null);
    setSearchQuery("");
    setSearchResults([]);
    setPlayRows([]);
  }, []);

  const showToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (editPlay) {
      setPlay({
        down: editPlay.down,
        distance: editPlay.distance,
        yard_line: editPlay.yard_line,
        side: editPlay.side,
        hash: editPlay.hash,
        formation: editPlay.formation,
        play_name: editPlay.play_name,
        result_tag: editPlay.result_tag,
        yards_gained: editPlay.yards_gained,
        note: editPlay.note ?? "",
      });
      setYardLine(editPlay.yard_line >= 1 && editPlay.yard_line <= 50 ? editPlay.yard_line : null);
      setDistanceInput(String(editPlay.distance));
      const tag = editPlay.result_tag;
      setResultTag(isFilmResultTag(tag) ? tag : null);
      setYardsInput(String(editPlay.yards_gained));
    } else {
      let nextYardLine: number | null = null;
      setPlay((prev) => {
        const nextYard = prev.yard_line >= 1 && prev.yard_line <= 50 ? prev.yard_line : 0;
        nextYardLine = nextYard >= 1 && nextYard <= 50 ? nextYard : null;
        return {
          ...PLAY_DEFAULT,
          down: prev.down,
          distance: prev.distance,
          formation: prev.formation,
          play_name: prev.play_name,
          yard_line: nextYard,
          side: prev.side,
          hash: prev.hash,
        };
      });
      setYardLine(nextYardLine);
      setDistanceInput(String(PLAY_DEFAULT.distance));
      setResultTag(null);
      setYardsInput("");
    }
  }, [editPlay, driveId]);

  const isGoalToGo = play.side === "OPP" && yardLine !== null && yardLine >= 1 && yardLine <= 10;

  useEffect(() => {
    if (play.side === "OPP" && yardLine !== null && yardLine >= 1 && yardLine <= 10) {
      setPlay((p) => ({ ...p, distance: yardLine }));
      setDistanceInput(String(yardLine));
    }
  }, [play.side, yardLine]);

  const resolvedTagForForm = editPlay
    ? (resultTag ?? (isFilmResultTag(play.result_tag) ? play.result_tag : null))
    : resultTag;

  const isDriveEndingSpecial = resultTag === "PUNT" || resultTag === "FIELD_GOAL";

  const showYardsInput =
    resolvedTagForForm !== null &&
    resolvedTagForForm !== "TURNOVER" &&
    resolvedTagForForm !== "INCOMPLETE" &&
    resolvedTagForForm !== "NO_GAIN" &&
    resolvedTagForForm !== "PUNT" &&
    resolvedTagForForm !== "FIELD_GOAL";

  useEffect(() => {
    const tag = resolvedTagForForm;
    if (tag === "TURNOVER" || tag === "INCOMPLETE" || tag === "NO_GAIN" || tag === "PUNT" || tag === "FIELD_GOAL") {
      setPlay((p) => ({ ...p, yards_gained: 0 }));
      setYardsInput("0");
    }
  }, [resolvedTagForForm]);

  useEffect(() => {
    if (isDriveEndingSpecial) {
      setPlay((p) => ({ ...p, formation: "", play_name: "" }));
    }
  }, [resultTag]);

  const loadFormationGroups = useCallback(async () => {
    if (!myPlaybook) return;
    setPickerLoading(true);
    try {
      const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(myPlaybook)}`);
      const data = (await res.json()) as { groups?: FormationGroup[] };
      setFormationGroups(data.groups ?? []);
    } finally {
      setPickerLoading(false);
    }
  }, [myPlaybook]);

  const loadPlaysForFormation = useCallback(
    async (formation: string) => {
      if (!myPlaybook) return;
      setPickerLoading(true);
      try {
        const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(myPlaybook)}&formation=${encodeURIComponent(formation)}`);
        const data = (await res.json()) as { plays?: PlayRow[] };
        setPlayRows(data.plays ?? []);
      } finally {
        setPickerLoading(false);
      }
    },
    [myPlaybook],
  );

  const openPicker = () => {
    resetPicker();
    setPickerOpen(true);
    void loadFormationGroups();
  };

  const playSearchActive = searchQuery.trim().length >= 2;

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || playSearchActive) return formationGroups;
    return formationGroups
      .map((g) => ({
        ...g,
        formations: g.formations.filter((f) => f.toLowerCase().includes(q)),
      }))
      .filter((g) => g.formations.length > 0);
  }, [formationGroups, searchQuery, playSearchActive]);

  useEffect(() => {
    if (!pickerOpen || !myPlaybook) {
      setIsSearching(false);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let ignore = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(myPlaybook)}&search=${encodeURIComponent(q)}`);
          const data = (await res.json()) as { grouped?: SearchFormationGroup[] };
          if (ignore) return;
          if (!res.ok) {
            setSearchResults([]);
            return;
          }
          setSearchResults(data.grouped ?? []);
        } catch {
          if (!ignore) setSearchResults([]);
        } finally {
          if (!ignore) setIsSearching(false);
        }
      })();
    }, 200);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery, myPlaybook, pickerOpen]);

  const applyResultTag = (tag: FilmResultTag) => {
    setResultTag(tag);
    if (tag === "NO_GAIN") {
      setYardsInput("0");
      setPlay((p) => ({ ...p, result_tag: tag, yards_gained: 0 }));
      return;
    }
    if (tag === "INCOMPLETE" || tag === "TURNOVER" || tag === "PUNT" || tag === "FIELD_GOAL") {
      setYardsInput("0");
      setPlay((p) => ({ ...p, result_tag: tag, yards_gained: 0 }));
      return;
    }
    if (tag === "LOSS") {
      setYardsInput("-5");
      setPlay((p) => ({ ...p, result_tag: tag, yards_gained: -5 }));
      return;
    }
    if (tag === "GAIN" || tag === "TOUCHDOWN") {
      setYardsInput("");
      setPlay((p) => ({ ...p, result_tag: tag, yards_gained: 0 }));
    }
  };

  const onYardsChange = (raw: string) => {
    setYardsInput(raw);
    const cleaned = raw.replace(/[^0-9-]/g, "");
    const n = parseInt(cleaned, 10);
    if (raw === "" || cleaned === "" || cleaned === "-") {
      setPlay((p) => ({ ...p, yards_gained: 0 }));
      return;
    }
    if (Number.isNaN(n)) {
      setPlay((p) => ({ ...p, yards_gained: 0 }));
      return;
    }
    setPlay((p) => ({ ...p, yards_gained: n }));
  };

  async function savePlay() {
    if (!driveId || isLogging) return;

    const resolvedTag = (editPlay ? (resultTag ?? play.result_tag) : resultTag) as string;
    const isResolvedDriveEndingSpecial = resolvedTag === "PUNT" || resolvedTag === "FIELD_GOAL";
    if (!isResolvedDriveEndingSpecial && (!play.formation || !play.play_name)) return;
    if (!resolvedTag) {
      window.alert("Select a result.");
      return;
    }

    if (yardLine === null || yardLine < 1 || yardLine > 50) {
      window.alert("Yard line must be between 1 and 50.");
      return;
    }

    let dist: number;
    if (isGoalToGo) {
      dist = yardLine;
    } else {
      const distParsed = parseInt(distanceInput.replace(/[^0-9]/g, ""), 10);
      if (distanceInput.trim() === "" || Number.isNaN(distParsed) || distParsed < 1) {
        window.alert("Enter a valid distance (yards to go).");
        return;
      }
      dist = Math.max(1, distParsed);
    }

    let yards = play.yards_gained;
    if (resolvedTag === "GAIN" || resolvedTag === "TOUCHDOWN") {
      if (yardsInput.trim() === "") {
        window.alert("Enter yards gained.");
        return;
      }
      yards = parseInt(yardsInput.replace(/[^0-9-]/g, ""), 10);
      if (Number.isNaN(yards)) {
        window.alert("Enter a valid yards number.");
        return;
      }
    } else if (
      resolvedTag === "NO_GAIN" ||
      resolvedTag === "INCOMPLETE" ||
      resolvedTag === "TURNOVER" ||
      resolvedTag === "PUNT" ||
      resolvedTag === "FIELD_GOAL"
    ) {
      yards = 0;
    } else if (resolvedTag === "LOSS") {
      yards = parseInt(yardsInput.replace(/[^0-9-]/g, ""), 10);
      if (!Number.isNaN(yards) && yards > 0) yards = -yards;
      if (yards === 0 || Number.isNaN(yards)) yards = -5;
    }

    const payload = {
      ...play,
      yard_line: yardLine,
      distance: dist,
      result_tag: resolvedTag,
      yards_gained: yards,
      game_session_id: gameSessionId,
      opponent_scheme: opponentScheme,
    };

    setIsLogging(true);
    try {
      if (editPlay) {
        const res = await fetch(`/api/plays/${editPlay.id}`, { method: "PUT", body: JSON.stringify(payload) });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          console.error("Play update error:", body.error ?? res.statusText);
          window.alert(body.error ?? "Could not save play.");
          return;
        }
        onClose();
      } else {
        const res = await fetch(`/api/drives/${driveId}/plays`, { method: "POST", body: JSON.stringify(payload) });
        const body = (await res.json().catch(() => ({}))) as { error?: string } & Partial<LoggedPlay>;
        if (!res.ok) {
          console.error("Play log error:", body.error ?? res.statusText);
          window.alert(body.error ?? "Could not log play.");
          return;
        }

        showToast();

        const next = getNextDownDistance(play.down, dist, yards ?? 0, resolvedTag);
        const downDistance =
          next ??
          ({
            down: 1,
            distance: 10,
          } as const);

        setPlay((prev) => ({
          ...prev,
          formation: prev.formation,
          yard_line: prev.yard_line,
          side: prev.side,
          hash: prev.hash,
          play_name: "",
          down: downDistance.down,
          distance: downDistance.distance,
          result_tag: "",
          yards_gained: 0,
          note: "",
        }));
        setDistanceInput(String(downDistance.distance));
        setResultTag(null);
        setYardsInput("");
      }

      await onLogged();
    } finally {
      setIsLogging(false);
    }
  }

  const yardsLabel =
    resolvedTagForForm === "LOSS"
      ? "Yards Lost"
      : resolvedTagForForm === "GAIN" || resolvedTagForForm === "TOUCHDOWN"
        ? "Yards Gained"
        : "Yards";

  const distanceValid = useMemo(() => {
    if (isGoalToGo) return true;
    const d = parseInt(distanceInput.replace(/[^0-9]/g, ""), 10);
    return distanceInput.trim() !== "" && !Number.isNaN(d) && d >= 1;
  }, [distanceInput, isGoalToGo]);

  const needsYardsEntry = resolvedTagForForm === "GAIN" || resolvedTagForForm === "TOUCHDOWN";
  const yardsEntryOk = !needsYardsEntry || yardsInput.trim() !== "";

  const canLogPlay = isDriveEndingSpecial
    ? play.down >= 1 && play.down <= 4 && distanceValid && yardLine !== null && Boolean(play.hash)
    : play.down >= 1 &&
      play.down <= 4 &&
      distanceValid &&
      yardLine !== null &&
      Boolean(play.hash) &&
      Boolean(play.formation) &&
      Boolean(play.play_name) &&
      resultTag !== null;

  const canSubmit = canLogPlay && yardsEntryOk;

  const submitDisabled = isLogging || !canSubmit;

  return (
    <>
      <PlayLoggedToast visible={toastVisible} />
      <div className="fixed inset-0 z-40 flex items-end bg-slate-950/70 p-3">
      <div className="app-card max-h-[90vh] w-full overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="app-section-title text-2xl">Play logger</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="app-field-label text-slate-400">Down & distance</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPlay((p) => ({ ...p, down: d }))}
                  className={`rounded py-3 text-sm font-bold ${
                    play.down === d ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {d === 1 ? "1ST" : d === 2 ? "2ND" : d === 3 ? "3RD" : "4TH"}
                </button>
              ))}
            </div>

            {isGoalToGo ? (
              <div className="space-y-1">
                <span className="app-field-label text-slate-400">Distance</span>
                <div className="flex items-center">
                  <span className="inline-flex items-center rounded-full border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-sm font-semibold text-amber-400">
                    GOAL TO GO
                  </span>
                </div>
              </div>
            ) : (
              <label className="space-y-1">
                <span className="app-field-label text-slate-400">Yards to go</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="hs-input app-input text-center text-lg font-mono"
                  value={distanceInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setDistanceInput(v);
                    const n = parseInt(v, 10);
                    if (!Number.isNaN(n) && n >= 1) setPlay((p) => ({ ...p, distance: n }));
                  }}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <p className="app-field-label text-slate-400">Field position</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid grid-cols-2 gap-2">
                {(["OWN", "OPP"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setPlay((p) => ({ ...p, side }))}
                    className={`rounded px-2 py-3 ${play.side === side ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}
                  >
                    {side}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="hs-input app-input text-center text-lg font-mono"
                value={yardLine ?? ""}
                placeholder="1–50"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") {
                    setYardLine(null);
                    setPlay((p) => ({ ...p, yard_line: 0 }));
                    return;
                  }
                  const num = parseInt(raw, 10);
                  if (num >= 1 && num <= 50) {
                    setYardLine(num);
                    setPlay((p) => ({ ...p, yard_line: num }));
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["LEFT", "MIDDLE", "RIGHT"] as const).map((hash) => (
                <button
                  key={hash}
                  type="button"
                  onClick={() => setPlay((p) => ({ ...p, hash }))}
                  className={`rounded px-2 py-3 ${play.hash === hash ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}
                >
                  {hash}
                </button>
              ))}
            </div>
          </div>

          {!isDriveEndingSpecial ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Formation + Play</p>
              {play.formation && play.play_name ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    {play.formation} → {play.play_name}
                  </span>
                  <button type="button" className="text-emerald-400 underline" onClick={openPicker}>
                    change
                  </button>
                </div>
              ) : (
                <button type="button" className="w-full rounded border border-slate-700 px-3 py-3 text-left" onClick={openPicker}>
                  Select formation & play
                </button>
              )}

              {pickerOpen ? (
                <div className="max-h-72 space-y-2 overflow-hidden rounded border border-slate-700 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      {pickerStep === "formation" ? (playSearchActive ? "Play search" : "Formations") : `Plays — ${selectedFormation}`}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-slate-400 underline"
                      onClick={() => {
                        if (pickerStep === "play") {
                          setPickerStep("formation");
                          setSelectedFormation(null);
                          setPlayRows([]);
                        } else {
                          setPickerOpen(false);
                          resetPicker();
                        }
                      }}
                    >
                      {pickerStep === "play" ? "Back" : "Close"}
                    </button>
                  </div>
                  {pickerStep === "formation" ? (
                    <>
                      <input
                        type="search"
                        placeholder="Search formations or plays..."
                        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {playSearchActive ? (
                        <div className="max-h-52 overflow-y-auto pr-1">
                          {isSearching || pickerLoading ? <p className="px-1 py-2 text-xs text-slate-500">Loading…</p> : null}
                          {!isSearching && !pickerLoading && searchResults.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-slate-500">
                              No plays found for &quot;{searchQuery.trim()}&quot;
                            </div>
                          ) : null}
                          {!isSearching && !pickerLoading
                            ? searchResults.map((group) => (
                                <div key={group.formation}>
                                  <div className="sticky top-0 border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {group.formation}
                                  </div>
                                  {group.plays.map((row) => (
                                    <button
                                      key={`${group.formation}-${row.play_name}`}
                                      type="button"
                                      className="block w-full border-b border-slate-800/50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-slate-800"
                                      onClick={() => {
                                        setPlay((p) => ({ ...p, formation: row.formation, play_name: row.play_name }));
                                        setSearchQuery("");
                                        setSearchResults([]);
                                        setPickerOpen(false);
                                        setPickerStep("formation");
                                        setSelectedFormation(null);
                                        setPlayRows([]);
                                      }}
                                    >
                                      <span className="text-xs text-slate-400">{row.formation}</span>
                                      <span className="ml-2 text-slate-100">{row.play_name}</span>
                                    </button>
                                  ))}
                                </div>
                              ))
                            : null}
                        </div>
                      ) : (
                        <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
                          {pickerLoading ? <p className="text-xs text-slate-500">Loading…</p> : null}
                          {filteredGroups.map((g) => (
                            <div key={g.formation_type}>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.formation_type}</p>
                              <ul className="space-y-1">
                                {g.formations.map((f) => (
                                  <li key={f}>
                                    <button
                                      type="button"
                                      className="w-full rounded bg-slate-800 px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                                      onClick={() => {
                                        setSelectedFormation(f);
                                        setPickerStep("play");
                                        void loadPlaysForFormation(f);
                                      }}
                                    >
                                      {f}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <ul className="max-h-52 space-y-1 overflow-y-auto">
                      {pickerLoading ? <p className="text-xs text-slate-500">Loading…</p> : null}
                      {playRows.map((row) => (
                        <li key={row.play_name}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 rounded bg-slate-800 px-2 py-2 text-left text-sm"
                            onClick={() => {
                              if (selectedFormation) {
                                setPlay((p) => ({ ...p, formation: selectedFormation, play_name: row.play_name }));
                              }
                              setPickerOpen(false);
                              resetPicker();
                            }}
                          >
                            <span>{row.play_name}</span>
                            {row.is_new_in_26 ? (
                              <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">NEW</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="app-field-label text-slate-400">Result</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {FILM_RESULT_BUTTONS.map(({ tag, label, color }) => {
                const active = resultTag === tag || (!resultTag && isFilmResultTag(play.result_tag) && play.result_tag === tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => applyResultTag(tag)}
                    className={`rounded px-2 py-2 font-medium ${resultColorClasses(color, active)}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {resolvedTagForForm ? (
              <div className="space-y-1">
                {showYardsInput ? (
                  <label>
                    <span className="app-field-label text-slate-400">{yardsLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern={resolvedTagForForm === "LOSS" ? undefined : "[0-9]*"}
                      className="hs-input app-input text-center text-2xl font-mono"
                      value={yardsInput}
                      placeholder="0"
                      onChange={(e) => onYardsChange(e.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="app-field-label text-slate-400">Note (optional)</p>
            <input
              maxLength={60}
              value={play.note}
              onChange={(e) => setPlay((p) => ({ ...p, note: e.target.value }))}
              className="hs-input app-input"
              placeholder="What happened? (optional)"
            />
          </div>

          <button type="button" onClick={() => void savePlay()} disabled={submitDisabled} className="btn-primary-block py-3 text-base">
            {isLogging ? (
              <span className="animate-pulse">{editPlay ? "Saving…" : "Logging…"}</span>
            ) : editPlay ? (
              "Save play"
            ) : (
              "Log play"
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
