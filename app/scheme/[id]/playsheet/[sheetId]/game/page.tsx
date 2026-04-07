import { InGamePlaySheetSession } from "@/components/InGamePlaySheetSession";

export default function PlaySheetLiveGamePage({
  params,
}: {
  params: { id: string; sheetId: string };
}) {
  return (
    <InGamePlaySheetSession schemeId={params.id} sheetId={params.sheetId} />
  );
}
