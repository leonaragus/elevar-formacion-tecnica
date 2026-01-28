export { createSupabaseBrowserClient } from "./supabase/client";
export { createSupabaseServerClient } from "./supabase/server";

// Alias “simple” para Server Components (convención común en Supabase + Next).
export { createSupabaseServerClient as createClient } from "./supabase/server";