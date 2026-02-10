import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devInscripciones, upsertInscripcion, deleteInscripcion, devPerfiles, devIntereses } from "@/lib/devstore";

async function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  
  if (process.env.NODE_ENV === "development") return true;
  if (hasHeaderOk || hasProfCookie) return true;

  // Check Supabase session
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    // ignore, continue to dev fallback
  }

  // Dev fallback: allow requests coming from Admin UI on same host
  if (process.env.NODE_ENV === "development") {
    try {
      const referer = req.headers.get("referer") || "";
      const origin = req.headers.get("origin") || "";
      if (referer) {
        const u = new URL(referer);
        const sameHost = u.hostname && req.nextUrl.hostname && u.hostname === req.nextUrl.hostname;
        const isAdminPath = u.pathname.startsWith("/admin");
        if (sameHost && isAdminPath) return true;
      }
      if (origin) {
        const o = new URL(origin);
        const sameHost = o.hostname && req.nextUrl.hostname && o.hostname === req.nextUrl.hostname;
        if (sameHost) return true;
      }
    } catch {}
  }
  return false;
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
  if (!(await isAuthorized(req))) {
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
        .select("user_id, curso_id, estado, created_at")
        .eq("estado", "pendiente")
        .limit(100);
      
      type PendingInscripcion = {
        user_id: string;
        curso_id: string;
        estado: string;
        user_email?: string | null;
        curso_titulo?: string | null;
        source?: string;
      };

      let combined: PendingInscripcion[] = [];
      if (!error && data) {
        combined = [...(data as any[])];
      }

      // También traer de intereses (solicitudes por email)
      const { data: intereses, error: errorIntereses } = await supabase
        .from("intereses")
        .select("email, course_id, created_at")
        .limit(100);
      
      let debugInfo = {
        interesesCount: intereses?.length || 0,
        interesesError: errorIntereses?.message || null,
        cursosAlumnosCount: data?.length || 0,
        cursosAlumnosError: error?.message || null,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      };

      if (Array.isArray(intereses) && intereses.length > 0 && !errorIntereses) {
        const mapped = intereses.map((i: any) => ({
          user_id: i.email,
          curso_id: i.course_id || i.curso_id,
          curso_titulo: null,
          user_email: i.email,
          estado: "pendiente",
          source: "intereses",
          created_at: i.created_at
        }));
        combined = [...combined, ...mapped];
      }

      if (error && combined.length === 0) {
        // ... (código existente de fallback) ...
      }
      
      const unique = combined.filter(
        (v, i, a) => a.findIndex((t) => t.user_id === v.user_id && t.curso_id === v.curso_id) === i
      );

      // Obtener información adicional de usuarios y cursos
      const userIds = unique.filter(item => !item.user_id.includes('@')).map(item => item.user_id);
      const courseIds = unique.map(item => item.curso_id);
      
      let userInfo: any = {};
      let courseInfo: any = {};
      
      if (userIds.length > 0) {
        try {
          const { data: users } = await supabase
            .from('users')
            .select('id, email, user_metadata->nombre, user_metadata->apellido')
            .in('id', userIds)
            .limit(100);
          
          if (users) {
            users.forEach(user => {
              userInfo[user.id] = { email: user.email, nombre: (user as any)?.user_metadata?.nombre || "", apellido: (user as any)?.user_metadata?.apellido || "" };
            });
          }
        } catch {}
      }
      
      if (courseIds.length > 0) {
        try {
          const { data: courses } = await supabase
            .from('cursos')
            .select('id, titulo')
            .in('id', courseIds)
            .limit(100);
          
          if (courses) {
            courses.forEach(course => {
              courseInfo[course.id] = { titulo: course.titulo };
            });
          }
        } catch {}
      }
      
       // Fallback local: agregar devInscripciones y devIntereses si existen
       const devPendIns = devInscripciones
         .filter(i => i.estado === "pendiente")
         .map(i => ({
           user_id: i.user_id,
           curso_id: i.curso_id,
           estado: i.estado,
           user_email: i.user_id.includes("@") ? i.user_id : undefined,
           created_at: undefined,
           source: "dev_inscripciones"
         }));
       const devPendInter = devIntereses.map(i => ({
         user_id: i.email,
         curso_id: i.curso_id,
         estado: "pendiente",
         user_email: i.email,
         created_at: i.when,
         source: "dev_intereses"
       }));
       const combinedAll = [...unique, ...devPendIns, ...devPendInter].filter(
         (v, i, a) => a.findIndex((t) => t.user_id === v.user_id && t.curso_id === v.curso_id) === i
       );

       // Enriquecer los datos con información adicional, incluyendo nombre y apellido
       const enriched = combinedAll.map(item => {
         const isEmailId = item.user_id.includes("@");
         const email = item.user_email || (isEmailId ? item.user_id : userInfo[item.user_id]?.email) || item.user_id;
         
         // Fallback nombre/apellido: users table or devPerfiles por email
         let nombre = isEmailId ? "" : (userInfo[item.user_id]?.nombre || "");
         let apellido = isEmailId ? "" : (userInfo[item.user_id]?.apellido || "");
         if (isEmailId) {
           const dev = devPerfiles.find(p => String(p.email).toLowerCase() === String(email).toLowerCase());
           if (dev) {
             nombre = dev.nombre || "";
             apellido = dev.apellido || "";
           }
         }
         
         return {
           ...item,
           user_email: email,
           curso_titulo: item.curso_titulo || courseInfo[item.curso_id]?.titulo || "Curso sin título",
           nombre,
           apellido
         };
       });
       
       // Ordenar por fecha de creación (desc) si está disponible
       const sorted = [...enriched].sort((a, b) => {
         const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
         const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
         return tb - ta;
       });
       
       return NextResponse.json({ ok: true, pendientes: sorted, debug: debugInfo });
    } else {
      const pend = devInscripciones.filter((i) => i.estado === "pendiente");
      return NextResponse.json({ ok: true, pendientes: pend });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
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
  if (!(await isAuthorized(req))) {
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
      // Intentar borrar de intereses primero (por si es una solicitud pendiente basada en email)
      try {
        if (String(user_id).includes("@")) {
          await supabase.from("intereses").delete().eq("email", user_id).eq("course_id", curso_id);
          // También intentar con nombre de columna curso_id por si acaso (aunque el esquema usa course_id)
          await supabase.from("intereses").delete().eq("email", user_id).eq("curso_id", curso_id);
        }
      } catch {}

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
          msg.includes("invalid input syntax") ||
          msg.includes("uuid") ||
          msg.includes("violates");
        if (shouldFallback) {
          deleteInscripcion(user_id, curso_id);
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      // Success in DB, but ensure we also clean up dev store just in case
      deleteInscripcion(user_id, curso_id);
      return NextResponse.json({ ok: true });
    } else {
      deleteInscripcion(user_id, curso_id);
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
