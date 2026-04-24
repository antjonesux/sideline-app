import { Suspense } from "react";
import { PlaybookEditor } from "@/components/playbook/PlaybookEditor";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";

export default async function PlaybookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PlaybookEditorSkeleton />}>
      <PlaybookEditor sheetId={id} />
    </Suspense>
  );
}
