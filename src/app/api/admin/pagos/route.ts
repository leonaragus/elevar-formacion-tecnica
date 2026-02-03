import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devInscripciones, devCursos, devPagos, addPago } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      supabase = null;
    }
    if (supabase) {
      const { data: activos, error: errActivos } = await supabase
        .from("cursos_alumnos")
        .select("user_id, curso_id, estado")
        .eq("estado", "activo")
        .limit(200);
      if (errActivos) return NextResponse.json({ ok: false, error: errActivos.message }, { status: 400 });

      const cursoIds = Array.isArray(activos) ? [...new Set(activos.map((r: any) => r.curso_id))] : [];
      const userIds = Array.isArray(activos) ? [...new Set(activos.map((r: any) => r.user_id))] : [];

      const { data: cursos, error: errCursos } = await supabase
        .from("cursos")
        .select("id, titulo, duracion, meses")
        .in("id", cursoIds.length ? cursoIds : ["-"])
        .limit(200);
      if (errCursos) return NextResponse.json({ ok: false, error: errCursos.message }, { status: 400 });

      const { data: pagos, error: errPagos } = await supabase
        .from("pagos_cursos")
        .select("user_id, curso_id, estado")
        .in("curso_id", cursoIds.length ? cursoIds : ["-"])
        .in("user_id", userIds.length ? userIds : ["-"])
        .limit(1000);
      const pagosList = errPagos ? [] : Array.isArray(pagos) ? pagos : [];

      return NextResponse.json({
        ok: true,
        activos: Array.isArray(activos) ? activos : [],
        cursos: Array.isArray(cursos) ? cursos : [],
        pagos: pagosList,
      });
    } else {
      const activos = devInscripciones.filter((i) => i.estado === "activo");
      const cursoIds = [...new Set(activos.map((r) => r.curso_id))];
      const cursos = devCursos.filter((c) => cursoIds.includes(c.id)).map((c) => ({
        id: c.id,
        titulo: c.titulo,
        duracion: c.duracion,
        meses: undefined,
      }));
      const pagosList = devPagos;
      return NextResponse.json({
        ok: true,
        activos,
        cursos,
        pagos: pagosList,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const ct = req.headers.get("content-type") || "";
    let user_id: string | undefined;
    let curso_id: string | undefined;
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      user_id = body?.user_id;
      curso_id = body?.curso_id;
    } else {
      const form = await req.formData().catch(() => null);
      const u = form?.get("user_id");
      const c = form?.get("curso_id");
      user_id = typeof u === "string" ? u : (u != null ? String(u) : undefined);
      curso_id = typeof c === "string" ? c : (c != null ? String(c) : undefined);
    }
    if (!user_id || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      supabase = null;
    }
    if (supabase) {
      const { error } = await supabase
        .from("pagos_cursos")
        .insert({
          user_id,
          curso_id,
          estado: "pagado",
          descripcion: "Pago confirmado manualmente",
        });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    } else {
      addPago(user_id, curso_id);
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
