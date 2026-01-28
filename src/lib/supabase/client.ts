import { createBrowserClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY");

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

