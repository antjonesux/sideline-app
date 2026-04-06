import { SavedPlaySheetClient } from "@/components/SavedPlaySheetClient";

export default function SavedPlaySheetPage({
  params,
}: {
  params: { id: string; sheetId: string };
}) {
  return (
    <SavedPlaySheetClient schemeId={params.id} sheetId={params.sheetId} />
  );
}
