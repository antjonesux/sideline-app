import Link from "next/link";
import { buildLoginHref } from "@/lib/navigation/loginHref";

export function GetStartedButton({ next }: { next?: string }) {
  return (
    <Link
      href={buildLoginHref({ register: true, next })}
      className="flex h-12 w-full items-center justify-center rounded-lg bg-[#059669] px-4 font-sans text-sm font-semibold tracking-[0.42px] text-white transition-colors hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
    >
      Get started
    </Link>
  );
}
