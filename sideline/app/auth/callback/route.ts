import { DEFAULT_POST_AUTH_PATH, resolveSafeNextPath } from "@/lib/navigation/loginHref";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function resolvePostAuthRedirect(searchParams: URLSearchParams): string {
  if (searchParams.get("type") === "recovery") {
    return "/reset-password";
  }
  return resolveSafeNextPath(searchParams.get("next"));
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const dest = resolvePostAuthRedirect(searchParams);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // Hash-token flow (access_token in fragment) cannot be read server-side.
  // If there's no code param the user may have landed here from a hash-based
  // redirect. Send them to the app root — the browser client will pick up
  // the tokens from the hash via onAuthStateChange.
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  const landingUrl = new URL("/landing", origin);
  const safePath = resolveSafeNextPath(searchParams.get("next"));
  if (safePath !== DEFAULT_POST_AUTH_PATH && safePath !== "/landing") {
    landingUrl.searchParams.set("next", safePath);
  }
  return NextResponse.redirect(landingUrl);
}
