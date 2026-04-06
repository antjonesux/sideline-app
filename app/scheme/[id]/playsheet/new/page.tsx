import { NewPlaySheetClient } from "@/components/NewPlaySheetClient";

export default function NewPlaySheetPage({
  params,
}: {
  params: { id: string };
}) {
  return <NewPlaySheetClient schemeId={params.id} />;
}
