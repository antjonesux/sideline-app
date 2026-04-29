import Link from "next/link";
import { buildLoginHref } from "@/lib/navigation/loginHref";

export function SignInLink({ next }: { next?: string }) {
  return (
    <Link
      href={buildLoginHref({ next })}
      className="flex min-h-9 w-full flex-wrap items-center justify-center gap-x-0 px-2 text-center font-sans text-sm font-medium leading-snug text-slate-400 transition-colors hover:text-slate-300 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
    >
      <span className="px-1">Already have an account?</span>{" "}
      <span className="text-emerald-500 underline decoration-emerald-500 underline-offset-2"> Sign in</span>
    </Link>
  );
}
