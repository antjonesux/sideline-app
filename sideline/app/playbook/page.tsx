import { PlaybookHome } from "@/components/playbook/PlaybookHome";

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string | string[] }>;
}) {
  const sp = await searchParams;
  return <PlaybookHome initialCreateOpen={sp.create === "1"} />;
}
