import { redirect } from "next/navigation";

/** Entry for “Get started”; account creation uses the same flow as `/login` (create account). */
export default function SignupPage() {
  redirect("/login?register=1");
}
