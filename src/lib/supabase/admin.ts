import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Supabase URL faltante");
  if (!serviceKey || !serviceKey.startsWith("eyJ")) throw new Error("Supabase Service Role Key inválida o faltante");
  return { url, key: serviceKey };
}

export function createSupabaseAdminClient() {
  const { url, key } = getSupabaseAdminEnv();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
