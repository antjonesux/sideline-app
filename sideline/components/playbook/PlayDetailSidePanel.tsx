"use client";

import { PlayDetailOverlay } from "@/components/playbook/PlayDetailOverlay";
import { SituationSideRail } from "@/components/shared/SituationSideRail";
import type { PlayIdentity } from "@/lib/types";
import { normalizePlayName } from "@/lib/utils";

/** Desktop / tablet play-detail side rail — same shell as Add Play. */
export function PlayDetailSidePanel({
  open,
  onClose,
  identity,
}: {
  open: boolean;
  onClose: () => void;
  identity: PlayIdentity;
}) {
  return (
    <SituationSideRail
      open={open}
      title={normalizePlayName(identity.play_name)}
      subtitle={`${identity.formation} · ${identity.playbook}`}
      onClose={onClose}
      closeAriaLabel="Close play detail"
    >
      <PlayDetailOverlay open={open} onClose={onClose} identity={identity} shell="panel" />
    </SituationSideRail>
  );
}
