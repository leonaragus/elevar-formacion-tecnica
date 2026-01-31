import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE");
  return { url, serviceKey };
}

export function createSupabaseAdminClient() {
  const { url, serviceKey } = getSupabaseAdminEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
