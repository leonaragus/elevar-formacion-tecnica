import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const checks: Record<string, any> = {};

  // Check existencia de tablas
  try {
    const { data, error } = await supabase
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
    const { error } = await supabase
      .from("cursos")
      .select("id")
      .limit(1);
    checks.cursos_exists = !error;
    checks.cursos_error = error?.message || null;
  } catch (e: any) {
    checks.cursos_exists = false;
    checks.cursos_error = e?.message || String(e);
  }

  return NextResponse.json({ ok: true, checks });
}
