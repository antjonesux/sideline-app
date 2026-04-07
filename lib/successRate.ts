import type { ResultTag } from "@/lib/liveTypes";

export function successRate(results: ResultTag[]): number {
  if (!results.length) return 0;
  const wins = results.filter((r) => r === "FIRST_DOWN" || r === "TOUCHDOWN").length;
  return (wins / results.length) * 100;
}
