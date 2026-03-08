import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("CRITICAL: Missing Supabase environment variables!");
    // En producción (Vercel), queremos que falle fuerte si no están
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Missing Supabase environment variables in production");
    }
  }

  return { 
    url: url || "https://dummy.supabase.co", 
    anonKey: anonKey || "invalid-key" 
  };
}

/**
 * Cliente para **Server Components** / **Server Actions**.
 *
 * Nota: en Server Components, Next puede impedir escribir cookies; por eso
 * `set/remove` están envueltos en `try/catch` (la escritura real se cubre con
 * `src/middleware.ts`).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components pueden ser de solo lectura.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Server Components pueden ser de solo lectura.
        }
      },
    },
  });
}
