import { createBrowserClient } from "@supabase/ssr";

function getSupabaseEnv() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Sanitize to prevent "Failed to execute 'set' on 'Headers': Invalid value" errors
  url = url.trim().replace(/\s/g, '');
  anonKey = anonKey.trim().replace(/\s/g, '');

  return { url, anonKey };
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Cliente para **Client Components** (navegador).
 * Úsalo dentro de componentes con `"use client"`.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabaseEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}

