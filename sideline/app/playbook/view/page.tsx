import { redirect } from "next/navigation";

/** Legacy bookmark — Call Sheet viewer now lives as a tab on the sheet editor. */
export default function CallSheetViewerRedirectPage() {
  redirect("/playbook");
}
