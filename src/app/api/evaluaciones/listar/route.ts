import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devEvaluaciones } from "@/lib/devstore";
import { devCursos } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

async function resolveActiveCourseTitle(req: NextRequest): Promise<string | null> {
  const okCookie = req.cookies.get("student_ok")?.value === "1";
  const courseIdCookie = req.cookies.get("student_course_id")?.value || null;

  let activeCourseId: string | null = okCookie && courseIdCookie ? String(courseIdCookie) : null;

  if (!activeCourseId) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: insc } = await supabase
          .from("cursos_alumnos")
          .select("curso_id,estado")
          .eq("user_id", user.id)
          .eq("estado", "activo")
          .limit(1);
        const row = Array.isArray(insc) && insc.length > 0 ? insc[0] : null;
        if (row?.curso_id != null) activeCourseId = String(row.curso_id);
      }
    } catch {
      activeCourseId = null;
    }
  }

  if (!activeCourseId) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data: curso } = await admin
      .from("cursos")
      .select("titulo")
      .eq("id", activeCourseId)
      .limit(1)
      .single();
    const t = curso?.titulo != null ? String(curso.titulo) : null;
    if (t && t.trim()) return t;
  } catch {}

  const dev = devCursos.find((c) => String(c.id) === String(activeCourseId));
  const t = dev?.titulo != null ? String(dev.titulo) : null;
  return t && t.trim() ? t : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");
  try {
    const teacher = isAuthorized(req);
    // Si es profesor, usa el filtro de URL. Si es alumno, intenta resolver su curso.
    // MODIFICADO: Si resolveActiveCourseTitle devuelve null, intentar buscar CUALQUIER curso activo en la BD
    let enforcedCourse = teacher ? course : await resolveActiveCourseTitle(req);
    
    // Fallback para alumnos: si no se pudo resolver el título exacto por cookie/devstore,
    // buscar en la base de datos si tiene alguna inscripción activa y usar ese título.
    if (!teacher && !enforcedCourse) {
        try {
            const supabase = await createSupabaseServerClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
                const { data: insc } = await supabase
                    .from("cursos_alumnos")
                    .select("curso_id, cursos(titulo)")
                    .eq("user_id", user.id)
                    .eq("estado", "activo")
                    .limit(1)
                    .single();
                
                const cursoInfo = Array.isArray(insc?.cursos) ? insc.cursos[0] : insc?.cursos;
                if (cursoInfo?.titulo) {
                    enforcedCourse = String(cursoInfo.titulo);
                }
            }
        } catch {}
    }

    if (!teacher && !enforcedCourse) {
      return NextResponse.json({ error: "No autorizado o sin curso activo" }, { status: 401 });
    }

    const supabase = teacher ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    // MODIFICADO: Usar búsqueda más flexible OR (si el nombre del curso coincide O si el campo course_id coincide)
    // Pero la tabla 'evaluaciones' actual solo tiene 'course_name' y 'course_id'.
    // Vamos a intentar filtrar por ambos si es posible, o relajar el filtro.
    
    let query = supabase
      .from("evaluaciones")
      .select("id,title,course_name,created_at,course_id")
      .order("created_at", { ascending: false });

    // Si hay un curso forzado (alumno), filtrar.
    if (enforcedCourse && !teacher) {
       // Buscar por coincidencia de nombre O si tuviéramos el ID. 
       // Como enforcedCourse es el Título, usamos ilike en course_name.
       // ADEMÁS: Si la evaluación no tiene curso asignado (null), a veces se muestran como "generales".
       // Pero lo seguro es filtrar por nombre del curso.
       query = query.ilike("course_name", `%${enforcedCourse}%`);
    }
    
    // Si es profesor y pidió filtrar
    if (teacher && course) {
        query = query.ilike("course_name", `%${course}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      // ... error handling existing ...
      const msg = String(error.message || "").toLowerCase();
      // ...
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
      return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
