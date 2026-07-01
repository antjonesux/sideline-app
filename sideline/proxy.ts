import { resolveSafeNextPath } from "@/lib/navigation/loginHref";
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/landing",
  "/signup",
  "/terms",
  "/privacy",
  "/auth/callback",
  "/auth/confirm",
  "/reset-password",
];

function isPublic(pathname: string) {
  // Screenshot QA — no session; production routes use notFound() in app/qa layouts.
  if (pathname.startsWith("/qa/onboarding")) return true;
  if (pathname.startsWith("/qa/play-sheet")) return true;
  if (pathname.startsWith("/qa/call-sheet")) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { user, supabaseResponse } = await updateSession(request);

  if (!user && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const search = request.nextUrl.search;
    const dest = search ? `${pathname}${search}` : pathname;
    const landingUrl = new URL("/landing", request.url);
    if (dest !== "/" && dest !== "/landing") {
      landingUrl.searchParams.set("next", dest);
    }
    return NextResponse.redirect(landingUrl);
  }

  if (user && pathname === "/login") {
    const dest = resolveSafeNextPath(request.nextUrl.searchParams.get("next"));
    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/landing") {
    const dest = resolveSafeNextPath(request.nextUrl.searchParams.get("next"));
    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
