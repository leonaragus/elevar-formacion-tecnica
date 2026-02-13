import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con Service Role Key para saltar RLS.
 * USAR CON PRECAUCIÓN: Solo en el lado del servidor y tras validación manual.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase Service Role environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
