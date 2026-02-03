import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devInscripciones, upsertInscripcion, deleteInscripcion } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

async function resolveUserIdFromEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  const created = await supabase.auth.admin
    .createUser({ email: normalized, email_confirm: true })
    .catch(() => null as any);
  const createdId = created?.data?.user?.id ?? null;
  if (createdId) return String(createdId);

  const listed = await supabase.auth.admin
    .listUsers({ page: 1, perPage: 1000 })
    .catch(() => null as any);
  const users = Array.isArray(listed?.data?.users) ? listed.data.users : [];
  const found = users.find((u: any) => String(u?.email || "").toLowerCase() === normalized);
  return typeof found?.id === "string" ? found.id : null;
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
      const { data, error } = await supabase
        .from("cursos_alumnos")
        .select("user_id, curso_id, estado")
        .eq("estado", "pendiente")
        .limit(100);
      
      let combined = [];
      if (!error && data) {
        combined = [...data];
      }

      // También traer de intereses (solicitudes por email)
      const { data: intereses, error: errorIntereses } = await supabase
        .from("intereses")
        .select("*") // Traer todo para evitar errores de selección de columnas
        .limit(100);
      
      let debugInfo = {
        interesesCount: intereses?.length || 0,
        interesesError: errorIntereses?.message || null,
        cursosAlumnosCount: data?.length || 0,
        cursosAlumnosError: error?.message || null,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      };

      if (intereses && intereses.length > 0) {
        const mapped = intereses.map((i: any) => ({
          user_id: i.email,
          curso_id: i.course_id || i.curso_id, // handle potential naming variance
          estado: "pendiente",
          source: "intereses"
        }));
        combined = [...combined, ...mapped];
      }

      if (error && combined.length === 0) {
        // ... (código existente de fallback) ...
      }
      
      const pend = devInscripciones.filter((i) => i.estado === "pendiente");
      // Deduplicate by user_id + curso_id
      const all = [...combined, ...pend];
      const unique = all.filter((v, i, a) => a.findIndex(t => t.user_id === v.user_id && t.curso_id === v.curso_id) === i);
      
      return NextResponse.json({ ok: true, pendientes: unique, debug: debugInfo });
    } else {
        const msg = String(error.message || "").toLowerCase();
        const shouldFallback =
          msg.includes("invalid api key") ||
          msg.includes("row-level security") ||
          msg.includes("permission denied") ||
          msg.includes("violates");
        if (shouldFallback) {
          const pend = devInscripciones.filter((i) => i.estado === "pendiente");
          return NextResponse.json({ ok: true, pendientes: pend });
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      
      const pend = devInscripciones.filter((i) => i.estado === "pendiente");
      // Deduplicate by user_id + curso_id
      const all = [...combined, ...pend];
      const unique = all.filter((v, i, a) => a.findIndex(t => t.user_id === v.user_id && t.curso_id === v.curso_id) === i);
      
      return NextResponse.json({ ok: true, pendientes: unique });
    } else {
      const pend = devInscripciones.filter((i) => i.estado === "pendiente");
      return NextResponse.json({ ok: true, pendientes: pend });
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
    const { user_id, curso_id } = await req.json();
    if (!user_id || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const userIdOrEmail = String(user_id).trim();
    const courseId = String(curso_id).trim();
    if (!courseId) {
      return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
    }
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      supabase = null;
    }
    if (supabase) {
      let resolvedUserId = userIdOrEmail;
      const looksLikeEmail = userIdOrEmail.includes("@");
      if (looksLikeEmail) {
        const resolved = await resolveUserIdFromEmail(supabase, userIdOrEmail);
        if (resolved) resolvedUserId = resolved;
      }
      const { error } = await supabase
        .from("cursos_alumnos")
        .upsert({ user_id: resolvedUserId, curso_id: courseId, estado: "activo" }, { onConflict: "curso_id,user_id" });
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        const shouldFallback =
          msg.includes("invalid api key") ||
          msg.includes("row-level security") ||
          msg.includes("permission denied") ||
          msg.includes("violates");
        if (shouldFallback) {
          upsertInscripcion(userIdOrEmail, courseId, "activo");
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      if (looksLikeEmail) {
        try {
          await supabase.from("intereses").delete().eq("email", userIdOrEmail.toLowerCase()).eq("course_id", courseId);
        } catch {}
        try {
          await supabase.from("intereses").delete().eq("email", userIdOrEmail.toLowerCase()).eq("curso_id", courseId);
        } catch {}
      }
      return NextResponse.json({ ok: true });
    } else {
      upsertInscripcion(userIdOrEmail, courseId, "activo");
      return NextResponse.json({ ok: true });
    }
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
    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
      supabase = null;
    }
    if (supabase) {
      const { error } = await supabase
        .from("cursos_alumnos")
        .delete()
        .eq("user_id", user_id)
        .eq("curso_id", curso_id);
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        const shouldFallback =
          msg.includes("invalid api key") ||
          msg.includes("row-level security") ||
          msg.includes("permission denied") ||
          msg.includes("violates");
        if (shouldFallback) {
          deleteInscripcion(user_id, curso_id);
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    } else {
      deleteInscripcion(user_id, curso_id);
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
