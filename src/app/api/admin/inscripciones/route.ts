import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  return token && expected && token === expected;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cursos_alumnos")
      .select("user_id, curso_id, estado")
      .eq("estado", "pendiente")
      .limit(100);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, pendientes: Array.isArray(data) ? data : [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { user_id, curso_id } = await req.json();
    if (!user_id || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("cursos_alumnos")
      .upsert({ user_id, curso_id, estado: "activo" }, { onConflict: "curso_id,user_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { user_id, curso_id } = await req.json();
    if (!user_id || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("cursos_alumnos")
      .delete()
      .eq("user_id", user_id)
      .eq("curso_id", curso_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
