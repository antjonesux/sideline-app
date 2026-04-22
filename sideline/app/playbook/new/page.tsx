import { redirect } from "next/navigation";

export default function NewPlaybookPage() {
  redirect("/playbook?create=1");
}
