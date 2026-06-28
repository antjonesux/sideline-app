"use client";

import { SegmentTabBar } from "@/components/shared/SegmentTabBar";
import { CALL_SHEET_VIEWER_TAB_FULL, CALL_SHEET_VIEWER_TAB_NEEDS } from "@/lib/coachCopy";

export type CallSheetEditorTab = "situations" | "coach-view";

const CALL_SHEET_EDITOR_TABS: [
  { id: "situations"; label: string },
  { id: "coach-view"; label: string },
] = [
  { id: "situations", label: CALL_SHEET_VIEWER_TAB_NEEDS },
  { id: "coach-view", label: CALL_SHEET_VIEWER_TAB_FULL },
];

export function CallSheetEditorTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: CallSheetEditorTab;
  onTabChange: (tab: CallSheetEditorTab) => void;
}) {
  return (
    <SegmentTabBar
      tabs={CALL_SHEET_EDITOR_TABS}
      activeTab={activeTab}
      onTabChange={onTabChange}
      ariaLabel="Call sheet views"
    />
  );
}
