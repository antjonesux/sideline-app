import type { ParsedCsvRow, RowValidationIssue, ValidatedImportPlay } from "@/lib/importCsv";
import { create } from "zustand";

export type GameSetup = {
  offensive_team: string;
  offensive_scheme: string;
  opponent_team: string;
  opponent_defensive_scheme: string;
  final_score: string;
  result: "W" | "L";
};

type ImportState = {
  step: number;
  gameSetup: GameSetup | null;
  templateDownloaded: boolean;
  parsedRows: ParsedCsvRow[];
  validRows: ValidatedImportPlay[];
  validationErrors: RowValidationIssue[];
  importedSessionId: string | null;
  importLoading: boolean;

  setStep: (step: number) => void;
  setGameSetup: (setup: GameSetup) => void;
  setTemplateDownloaded: (v: boolean) => void;
  setParsedData: (parsed: ParsedCsvRow[], valid: ValidatedImportPlay[], errors: RowValidationIssue[]) => void;
  setImportedSession: (id: string) => void;
  setImportLoading: (v: boolean) => void;
  reset: () => void;
};

const initial = {
  step: 1,
  gameSetup: null,
  templateDownloaded: false,
  parsedRows: [] as ParsedCsvRow[],
  validRows: [] as ValidatedImportPlay[],
  validationErrors: [] as RowValidationIssue[],
  importedSessionId: null,
  importLoading: false,
};

export const useImportStore = create<ImportState>((set) => ({
  ...initial,

  setStep: (step) => set({ step }),
  setGameSetup: (gameSetup) => set({ gameSetup }),
  setTemplateDownloaded: (templateDownloaded) => set({ templateDownloaded }),
  setParsedData: (parsedRows, validRows, validationErrors) => set({ parsedRows, validRows, validationErrors }),
  setImportedSession: (importedSessionId) => set({ importedSessionId }),
  setImportLoading: (importLoading) => set({ importLoading }),
  reset: () => set(initial),
}));
