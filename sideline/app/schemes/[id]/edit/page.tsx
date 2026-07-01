import { SchemeForm } from "@/components/schemes/SchemeForm";

type Ctx = { params: Promise<{ id: string }> };

export default async function EditSchemePage({ params }: Ctx) {
  const { id } = await params;
  return <SchemeForm mode="edit" schemeId={id} />;
}
