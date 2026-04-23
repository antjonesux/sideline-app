import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for admin operations (e.g. account deletion).
 * Production must set SUPABASE_SERVICE_ROLE_KEY — local dev without it will
 * receive a clear error from the calling API route.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin operations.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
