// Safe wrapper around supabase client - prevents app crash if env vars are missing
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _supabase: SupabaseClient<Database> | null = null;
let _initError: string | null = null;

try {
  // Dynamic import would be ideal but we need synchronous access
  // So we try the direct import and catch any throw
  const mod = await import("./client");
  _supabase = mod.supabase;
} catch (err: any) {
  _initError = err?.message ?? "Supabase initialization failed";
  console.error("Supabase init failed:", _initError);
}

export const safeSupabase = _supabase;
export const supabaseInitError = _initError;
