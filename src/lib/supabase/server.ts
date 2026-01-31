import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return { url, anonKey };
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
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Components pueden ser de solo lectura.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          // Server Components pueden ser de solo lectura.
        }
      },
    },
  });
}

