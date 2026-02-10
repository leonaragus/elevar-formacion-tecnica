import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devCursos } from "@/lib/devstore";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toClientCurso = (c: any) => ({
  id: String(c.id ?? ""),
  titulo: String(c.titulo ?? ""),
  descripcion: typeof c.descripcion === "string" ? c.descripcion : "",
  duracion: typeof c.duracion === "string" ? c.duracion : "",
  modalidad:
    c?.modalidad === "presencial" || c?.modalidad === "virtual" || c?.modalidad === "semipresencial" || c?.modalidad === "a distancia"
      ? c.modalidad
      : "virtual",
  categoria: typeof c.categoria === "string" ? c.categoria : "",
  nivel:
    c?.nivel === "inicial" || c?.nivel === "intermedio" || c?.nivel === "avanzado" || c?.nivel === "especializacion"
      ? c.nivel
      : "inicial",
  precio: typeof c.precio === "number" ? c.precio : 0,
  estado:
    c?.estado === "activo" || c?.estado === "inactivo" || c?.estado === "en_desarrollo" || c?.estado === "suspendido"
      ? c.estado
      : "en_desarrollo",
  created_at: typeof c.created_at === "string" ? c.created_at : new Date().toISOString(),
  updated_at: typeof c.updated_at === "string" ? c.updated_at : new Date().toISOString(),
});

async function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  if (hasHeaderOk || hasProfCookie) return true;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return true;
  } catch {}
  return false;
}

export async function GET(req: NextRequest) {
  const isPublic = req.nextUrl.searchParams.get("public") === "1" || req.headers.get("x-public") === "1";
  if (!isPublic && !(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    console.log("[GET /api/admin/cursos] Iniciando...");
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
      console.log("[GET /api/admin/cursos] Cliente Supabase creado");
    } catch (error) {
      console.error("[GET /api/admin/cursos] Error creando cliente Supabase:", error);
      supabase = null;
    }

    let cursosList: any[] = [];
    if (supabase) {
      console.log("[GET /api/admin/cursos] Consultando cursos...");
      const { data: cursos, error: errCursos } = await supabase
        .from("cursos")
        .select("*")
        .order("orden", { ascending: true })
        .limit(200);
      
      console.log("[GET /api/admin/cursos] Resultado cursos:", { dataCount: cursos?.length, error: errCursos });
      cursosList = errCursos ? [] : Array.isArray(cursos) ? cursos : [];
    }
    const cursosOut = [...cursosList, ...devCursos].map(toClientCurso);

    let alumnosList: Array<{ id: string; curso_id: string; email?: string; nombre?: string; apellido?: string; created_at?: string; estado?: string }> = [];
    if (supabase && !isPublic) {
      console.log("[GET /api/admin/cursos] Consultando inscripciones...");
      const { data: ca, error: errCA } = await supabase
        .from("cursos_alumnos")
        .select("curso_id, user_id, estado, created_at")
        .limit(1000);
      
      console.log("[GET /api/admin/cursos] Resultado inscripciones:", { dataCount: ca?.length, error: errCA });
      const base = errCA
        ? []
        : Array.isArray(ca)
          ? ca.map((r: any) => ({
              id: String(r.user_id ?? ""),
              curso_id: String(r.curso_id ?? ""),
              estado: String(r.estado ?? ""),
              created_at: typeof r.created_at === "string" ? r.created_at : undefined,
            }))
          : [];

      const userIds = [...new Set(base.map((r) => r.id).filter((v) => v && !String(v).includes("@")))];
      let usersData: Array<{ id: string; email: string; user_metadata: any; created_at?: string }> = [];
      try {
        if (userIds.length > 0) {
          const { data } = await supabase
            .from("users")
            .select("id, email, user_metadata, created_at")
            .in("id", userIds);
          usersData = Array.isArray(data) ? (data as any) : [];
        }
      } catch {}
      const userMap = new Map(usersData.map((u: any) => [String(u.id), u]));

      alumnosList = base.map((r) => {
        const u = userMap.get(r.id);
        const email =
          typeof r.id === "string" && r.id.includes("@")
            ? r.id
            : (u?.email ? String(u.email) : undefined);
        const nombre = u?.user_metadata?.nombre || "";
        const apellido = u?.user_metadata?.apellido || "";
        const created_at = r.created_at || (u?.created_at ? String(u.created_at) : undefined);
        return { ...r, email, nombre, apellido, created_at };
      });
    } else if (!isPublic) {
      try {
        const { devInscripciones } = await import("@/lib/devstore");
        alumnosList = devInscripciones.map((i) => ({
          id: String(i.user_id),
          curso_id: String(i.curso_id),
          email: String(i.user_id),
          estado: String(i.estado),
          nombre: "",
          apellido: "",
          created_at: new Date().toISOString(),
        }));
      } catch {}
    }

    console.log("[GET /api/admin/cursos] Finalizado exitosamente");
    return NextResponse.json({ ok: true, cursos: cursosOut, alumnos: alumnosList });
  } catch (e: any) {
    console.error("[GET /api/admin/cursos] Error completo:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
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
    const nivel = typeof body.nivel === "string" ? body.nivel.trim() : "inicial";
    const modalidad = typeof body.modalidad === "string" ? body.modalidad.trim() : "virtual";
    const categoria = typeof body.categoria === "string" ? body.categoria.trim() : "";
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
    const insertPayload: any = { id, titulo, descripcion: descripcion || null, duracion: duracion || null, nivel: nivel || null, orden: 0, modalidad: modalidad || 'virtual', categoria: categoria || null, precio: precio || 0, estado: estado || 'en_desarrollo' };
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

export async function PUT(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { id, titulo, descripcion, duracion, modalidad, categoria, nivel, precio, estado, orden, profesor, meses } = body;
    
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient();
    const updatePayload: any = {};
    if (titulo !== undefined) updatePayload.titulo = titulo;
    if (descripcion !== undefined) updatePayload.descripcion = descripcion;
    if (duracion !== undefined) updatePayload.duracion = duracion;
    if (nivel !== undefined) updatePayload.nivel = nivel;
    if (modalidad !== undefined) updatePayload.modalidad = modalidad;
    if (categoria !== undefined) updatePayload.categoria = categoria;
    if (precio !== undefined) updatePayload.precio = precio;
    if (estado !== undefined) updatePayload.estado = estado;
    if (orden !== undefined) updatePayload.orden = orden;
    if (profesor !== undefined) updatePayload.profesor = profesor;
    if (meses !== undefined) updatePayload.meses = meses;
    
    const { data, error } = await supabase
      .from("cursos")
      .update(updatePayload)
      .eq("id", id)
      .select("id")
      .single();
      
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
    }
    
    const supabase = createSupabaseAdminClient();
    
    const { error } = await supabase
      .from("cursos")
      .delete()
      .eq("id", id);
      
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
