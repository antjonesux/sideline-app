import { buildPlaySetupKey } from "@/lib/playSetupKey";
import type { PlayIdentity } from "@/lib/types";

export const playSetupsQueryKeys = {
  all: ["play-setups"] as const,
  list: (identity: PlayIdentity) =>
    [...playSetupsQueryKeys.all, "list", buildPlaySetupKey(identity)] as const,
  counts: (gameVersion: string, sideOfBall: string, playbook: string) =>
    [
      ...playSetupsQueryKeys.all,
      "counts",
      gameVersion.trim().toLowerCase(),
      sideOfBall.trim().toLowerCase(),
      playbook.trim().toLowerCase(),
    ] as const,
};
