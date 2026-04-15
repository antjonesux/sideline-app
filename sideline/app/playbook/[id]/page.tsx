import { PlaybookEditor } from "@/components/playbook/PlaybookEditor";

export default async function PlaybookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaybookEditor sheetId={id} />;
}
