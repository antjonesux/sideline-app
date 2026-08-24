import { resolveSafeNextPath } from "@/lib/navigation/loginHref";
import { FILM_GUIDED_ONBOARDING_HEADER, isFilmRoomBetaUser } from "@/lib/featureFlags";
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

function withRequestHeader(request: NextRequest, response: NextResponse, name: string, value: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(name, value);
  const next = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.getAll().forEach((cookie) => {
    next.cookies.set(cookie);
  });
  return next;
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

  // Film Room beta: hide /film from non-beta users. Allow guided onboarding (?guided=1)
  // so Play Sheet → Film still works while Film Room stays out of nav.
  if (pathname.startsWith("/film")) {
    const guided = request.nextUrl.searchParams.get("guided") === "1";
    if (guided) {
      return withRequestHeader(request, supabaseResponse, FILM_GUIDED_ONBOARDING_HEADER, "1");
    }
    if (!isFilmRoomBetaUser(user?.id)) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
