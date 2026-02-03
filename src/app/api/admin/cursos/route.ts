import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devCursos } from "@/lib/devstore";

const toClientCurso = (c: any) => ({
  id: String(c.id ?? ""),
  titulo: String(c.titulo ?? ""),
  descripcion: typeof c.descripcion === "string" ? c.descripcion : "",
  duracion: typeof c.duracion === "string" ? c.duracion : "",
  modalidad: typeof c.modalidad === "string" ? c.modalidad : "virtual",
  categoria: typeof c.categoria === "string" ? c.categoria : "",
  nivel: typeof c.nivel === "string" ? c.nivel : "inicial",
  precio: typeof c.precio === "number" ? c.precio : 0,
  estado: typeof c.estado === "string" ? c.estado : "en_desarrollo",
  created_at: typeof c.created_at === "string" ? c.created_at : new Date().toISOString(),
  updated_at: typeof c.updated_at === "string" ? c.updated_at : (typeof c.created_at === "string" ? c.created_at : new Date().toISOString()),
});

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function GET(req: NextRequest) {
  const isPublic = req.nextUrl.searchParams.get("public") === "1" || req.headers.get("x-public") === "1";
  if (!isPublic && !isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      supabase = null;
    }

    let cursosList: any[] = [];
    if (supabase) {
      const { data: cursos, error: errCursos } = await supabase
        .from("cursos")
        .select("*")
        .order("orden", { ascending: true })
        .limit(200);
      cursosList = errCursos ? [] : Array.isArray(cursos) ? cursos : [];
    }
    const cursosOut = [...cursosList, ...devCursos].map(toClientCurso);

    let alumnosList: Array<{ id: string; curso_id: string }> = [];
    if (supabase && !isPublic) {
      const { data: ca, error: errCA } = await supabase
        .from("cursos_alumnos")
        .select("curso_id, user_id")
        .limit(1000);
      alumnosList = errCA
        ? []
        : Array.isArray(ca)
          ? ca.map((r: any) => ({ id: String(r.user_id ?? ""), curso_id: String(r.curso_id ?? "") }))
          : [];
    }

    return NextResponse.json({ ok: true, cursos: cursosOut, alumnos: alumnosList });
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
    let body: any = {};
    if (ct.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const form = await req.formData().catch(() => null);
      if (form) {
        body = {
          titulo: form.get("titulo"),
          descripcion: form.get("descripcion"),
        };
      }
    }

    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
    const duracion = typeof body.duracion === "string" ? body.duracion.trim() : "";
    const modalidad = typeof body.modalidad === "string" ? body.modalidad.trim() : "virtual";
    const categoria = typeof body.categoria === "string" ? body.categoria.trim() : "";
    const nivel = typeof body.nivel === "string" ? body.nivel.trim() : "inicial";
    const precio = typeof body.precio === "number" ? body.precio : 0;
    const estado = typeof body.estado === "string" ? body.estado.trim() : "en_desarrollo";

    if (!titulo) {
      return NextResponse.json({ ok: false, error: "Título requerido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const idBase = titulo.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 64);
    const id = idBase || `curso-${Date.now()}`;
    const insertPayload: any = { id, titulo, descripcion: descripcion || null, duracion: duracion || null, orden: 0 };
    const { data, error } = await supabase
      .from("cursos")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      const shouldFallback =
        msg.includes("invalid api key") || msg.includes("row-level security") || msg.includes("violates") || msg.includes("not-null") || msg.includes("permission denied");
      if (shouldFallback) {
        const devId = id || `dev-${Date.now()}`;
        devCursos.push(toClientCurso({
          id: devId,
          titulo,
          descripcion,
          duracion,
          modalidad,
          categoria,
          nivel,
          precio,
          estado,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        return NextResponse.json({ ok: true, id: devId });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
