import type { ParsedCsvRow, RowValidationIssue, ValidatedImportPlay } from "@/lib/importCsv";
import { create } from "zustand";

export type GameSetup = {
  my_team: string;
  opponent_team: string;
  offensive_playbook: string;
  my_score: number;
  opponent_score: number;
  result: "W" | "L";
};

type ImportState = {
  step: 1 | 2 | 3;
  gameSetup: GameSetup | null;
  parsedRows: ParsedCsvRow[];
  validRows: ValidatedImportPlay[];
  validationErrors: RowValidationIssue[];
  importedSessionId: string | null;
  /** When set, import attaches plays to this session and skips “Tag This Game”. */
  importTargetSessionId: string | null;

  setStep: (step: 1 | 2 | 3) => void;
  setGameSetup: (setup: GameSetup | null) => void;
  setParsedData: (parsed: ParsedCsvRow[], valid: ValidatedImportPlay[], errors: RowValidationIssue[]) => void;
  setImportedSession: (id: string | null) => void;
  setImportTargetSessionId: (id: string | null) => void;
  /** Clears CSV parse + import result; keeps or clears game setup via flag. */
  resetParsed: (opts?: { clearGameSetup?: boolean }) => void;
  reset: () => void;
};

const initial = {
  step: 1 as 1 | 2 | 3,
  gameSetup: null as GameSetup | null,
  parsedRows: [] as ParsedCsvRow[],
  validRows: [] as ValidatedImportPlay[],
  validationErrors: [] as RowValidationIssue[],
  importedSessionId: null,
  importTargetSessionId: null as string | null,
};

export const useImportStore = create<ImportState>((set) => ({
  ...initial,

  setStep: (step) => set({ step }),
  setGameSetup: (gameSetup) => set({ gameSetup }),
  setParsedData: (parsedRows, validRows, validationErrors) => set({ parsedRows, validRows, validationErrors }),
  setImportedSession: (importedSessionId) => set({ importedSessionId }),
  setImportTargetSessionId: (importTargetSessionId) => set({ importTargetSessionId }),
  resetParsed: (opts) =>
    set((s) => ({
      step: 1,
      parsedRows: [],
      validRows: [],
      validationErrors: [],
      importedSessionId: null,
      gameSetup: opts?.clearGameSetup ? null : s.gameSetup,
    })),
  reset: () => set(initial),
}));
