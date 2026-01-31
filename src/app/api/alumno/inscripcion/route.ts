import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }
  const ct = req.headers.get("content-type") || "";
  let curso_id: string | undefined;
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({} as any));
    curso_id = typeof body?.curso_id === "string" ? body.curso_id : undefined;
  } else {
    const form = await req.formData().catch(() => null);
    const v = form?.get("curso_id");
    curso_id = typeof v === "string" ? v : (v != null ? String(v) : undefined);
  }
  if (!curso_id || typeof curso_id !== "string") {
    return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
  }
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from("cursos_alumnos")
      .upsert({ user_id: user.id, curso_id, estado: "pendiente" }, { onConflict: "curso_id,user_id" });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("cursos_alumnos")
      .select("curso_id, estado")
      .eq("user_id", user.id)
      .limit(20);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, inscripciones: Array.isArray(data) ? data : [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
