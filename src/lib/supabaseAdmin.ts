import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      `Missing Supabase env. hasUrl=${!!url} hasServiceRole=${!!key} cwd=${process.cwd()}`
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}