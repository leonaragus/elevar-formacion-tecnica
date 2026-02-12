import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest) {
  const checks: Record<string, any> = {};
  let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    supabase = createSupabaseAdminClient();
    checks.admin_client_ok = true;
  } catch (e: any) {
    checks.admin_client_ok = false;
    checks.admin_client_error = e?.message || String(e);
  }

  const urlMasked = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 20);
  const keyMasked = (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 6);
  checks.env = {
    url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key_present: !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY),
    url_sample: urlMasked,
    key_prefix: keyMasked ? keyMasked + "***" : null
  };

  // Check existencia de tablas
  try {
    const { data, error } = await (supabase || createSupabaseAdminClient())
      .from("cursos_alumnos")
      .select("curso_id, user_id")
      .limit(1);
    checks.cursos_alumnos_exists = !error;
    checks.cursos_alumnos_error = error?.message || null;
    checks.sample = data || [];
  } catch (e: any) {
    checks.cursos_alumnos_exists = false;
    checks.cursos_alumnos_error = e?.message || String(e);
  }

  // Check cursos
  try {
    const { error } = await (supabase || createSupabaseAdminClient())
      .from("cursos")
      .select("id")
      .limit(1);
    checks.cursos_exists = !error;
    checks.cursos_error = error?.message || null;
  } catch (e: any) {
    checks.cursos_exists = false;
    checks.cursos_error = e?.message || String(e);
  }

  // Buckets
  try {
    const { data: buckets, error } = await (supabase || createSupabaseAdminClient()).storage.listBuckets();
    checks.buckets = Array.isArray(buckets) ? buckets.map((b: any) => b.name) : [];
    checks.buckets_error = error?.message || null;
  } catch (e: any) {
    checks.buckets = [];
    checks.buckets_error = e?.message || String(e);
  }

  return NextResponse.json({ ok: true, checks });
}
