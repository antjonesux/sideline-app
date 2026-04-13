import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_KEY ??
  "";

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");
