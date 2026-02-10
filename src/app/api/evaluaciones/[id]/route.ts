import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
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

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  try {
    const teacher = isAuthorized(req);
    const enforcedCourse = teacher ? null : await resolveActiveCourseTitle(req);
    if (!teacher && !enforcedCourse) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      const shouldFallback =
        msg.includes("invalid api key") ||
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("violates");
      if (shouldFallback) {
        const item = devEvaluaciones.find((e) => e.id === id);
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ item });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!teacher && enforcedCourse) {
      const courseName = data?.course_name != null ? String(data.course_name) : "";
      if (!courseName.toLowerCase().includes(enforcedCourse.toLowerCase())) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ item: data });
  } catch {
    const teacher = isAuthorized(req);
    const enforcedCourse = teacher ? null : await resolveActiveCourseTitle(req);
    if (!teacher && !enforcedCourse) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const item = devEvaluaciones.find((e) => e.id === id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!teacher && enforcedCourse) {
      const courseName = item?.course_name != null ? String(item.course_name) : "";
      if (!courseName.toLowerCase().includes(enforcedCourse.toLowerCase())) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ item });
  }
}
