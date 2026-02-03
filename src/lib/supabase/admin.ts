import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  const hasValidService = typeof serviceKey === "string" && serviceKey.length > 20;
  const key = hasValidService ? serviceKey : anonKey;
  if (!key) {
      console.warn("Falta SUPABASE_SERVICE_ROLE_KEY y ANON_KEY");
      // Fallback dummy key to prevent crash, but calls will fail
      return { url, key: "invalid-key" };
  }
  return { url, key };
}

export function createSupabaseAdminClient() {
  const { url, key } = getSupabaseAdminEnv();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
