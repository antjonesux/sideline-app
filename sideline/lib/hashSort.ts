export type PlaySheetPlay = { play_order: number; formation: string; play_name: string };
export type PlayStat = { formation: string; play_name: string; hash: string; success_rate: number };

export function sortByHashPerformance(plays: PlaySheetPlay[], currentHash: string, playStats: PlayStat[]) {
  return [...plays].sort((a, b) => {
    const aHash = playStats.find(
      (s) => s.formation === a.formation && s.play_name === a.play_name && s.hash === currentHash,
    );
    const bHash = playStats.find(
      (s) => s.formation === b.formation && s.play_name === b.play_name && s.hash === currentHash,
    );

    if (!aHash && !bHash) return a.play_order - b.play_order;
    if (!aHash) return 1;
    if (!bHash) return -1;
    return bHash.success_rate - aHash.success_rate;
  });
}
