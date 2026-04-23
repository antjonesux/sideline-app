import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/film";
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/film";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
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
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  const loginUrl = new URL("/login", origin);
  if (safePath !== "/film") loginUrl.searchParams.set("next", safePath);
  return NextResponse.redirect(loginUrl);
}
