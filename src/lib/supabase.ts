import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "smartminiscankart-auth",
    },
  }
);

/**
 * Backward compatibility wrapper.
 * Existing code can still call queueSupabaseAuth(...)
 * but it no longer creates a custom queue.
 */
export async function queueSupabaseAuth<T>(
  fn: () => Promise<T>
): Promise<T> {
  return await fn();
}