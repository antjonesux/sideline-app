import { SchemeDetailView } from "@/components/schemes/SchemeDetailView";

type Ctx = { params: Promise<{ id: string }> };

export default async function SchemeDetailPage({ params }: Ctx) {
  const { id } = await params;
  return <SchemeDetailView schemeId={id} />;
}
