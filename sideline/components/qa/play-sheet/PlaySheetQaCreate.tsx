"use client";

import { CreatePlaybookModal } from "@/components/playbook/CreatePlaybookModal";
import {
  playSheetQaCfb26Playbook,
  playSheetQaSheetName,
  playSheetQaStaticCfb26Playbooks,
} from "@/lib/playSheetQaFixture";

export function PlaySheetQaCreate() {
  return (
    <CreatePlaybookModal variant="page" open qaStaticPlaybooks={playSheetQaStaticCfb26Playbooks} />
  );
}

export function PlaySheetQaCreateReady() {
  return (
    <CreatePlaybookModal
      variant="page"
      open
      qaStaticPlaybooks={playSheetQaStaticCfb26Playbooks}
      qaPrefill={{ name: playSheetQaSheetName, playbook: playSheetQaCfb26Playbook }}
    />
  );
}
