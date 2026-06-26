import { Suspense } from "react";
import { CallSheetViewer } from "@/components/playbook/CallSheetViewer";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";

export default function CallSheetViewerPage() {
  return (
    <Suspense fallback={<PlaybookEditorSkeleton />}>
      <CallSheetViewer />
    </Suspense>
  );
}
