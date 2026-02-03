import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, questions, courseName, sourceFilename } = body || {};

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const teacher = isAuthorized(req);
    const enforcedCourse = teacher ? (courseName || null) : await resolveActiveCourseTitle(req);
    if (!teacher && !enforcedCourse) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const insertPayload = {
      title,
      questions,
      course_name: enforcedCourse || null,
      source_filename: sourceFilename || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("evaluaciones")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, evaluacion: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
