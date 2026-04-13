import { createClient } from "@supabase/supabase-js";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** URL + anon key from `.env.local` (`NEXT_PUBLIC_*` only). Empty strings are treated as unset. */
export function getPublicSupabaseCredentials(): { url: string; anonKey: string } | null {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

const creds = getPublicSupabaseCredentials();
const url = creds?.url ?? "";
const anonKey = creds?.anonKey ?? "";

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
  auth: { persistSession: false },
});
