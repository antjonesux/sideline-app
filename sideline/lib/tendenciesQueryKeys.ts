export const tendenciesQueryKeys = {
  all: ["tendencies"] as const,
  topPlays: (params: string) => [...tendenciesQueryKeys.all, "top-plays", params] as const,
  topFormations: (params: string) => [...tendenciesQueryKeys.all, "top-formations", params] as const,
  predictability: (params: string) => [...tendenciesQueryKeys.all, "predictability", params] as const,
  game: (gameId: string) => [...tendenciesQueryKeys.all, "game", gameId] as const,
  opponents: () => [...tendenciesQueryKeys.all, "opponents"] as const,
};
