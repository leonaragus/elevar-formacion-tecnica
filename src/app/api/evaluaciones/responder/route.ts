import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { devRespuestasEvaluacion } from "@/lib/devstore";
import { devEvaluaciones } from "@/lib/devstore";
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

async function isEvaluacionInCourseTitle(evaluacionId: string, courseTitle: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("evaluaciones")
      .select("course_name")
      .eq("id", evaluacionId)
      .limit(1)
      .single();
    const cn = data?.course_name != null ? String(data.course_name) : "";
    return cn.toLowerCase().includes(courseTitle.toLowerCase());
  } catch {
    const it = devEvaluaciones.find((e) => e.id === evaluacionId);
    const cn = it?.course_name != null ? String(it.course_name) : "";
    return cn.toLowerCase().includes(courseTitle.toLowerCase());
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { evaluacionId, userId, answers, score } = body || {};
  if (!evaluacionId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const teacher = isAuthorized(req);
  if (!teacher) {
    const enforcedCourse = await resolveActiveCourseTitle(req);
    if (!enforcedCourse) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const ok = await isEvaluacionInCourseTitle(String(evaluacionId), enforcedCourse);
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const payload = {
    evaluacion_id: evaluacionId,
    user_id: userId || null,
    answers,
    score: score || null,
    created_at: new Date().toISOString(),
  };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("evaluaciones_respuestas")
      .insert(payload)
      .select()
      .single();
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      const shouldFallback =
        msg.includes("invalid api key") ||
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("violates");
      if (shouldFallback) {
        devRespuestasEvaluacion.push(payload);
        return NextResponse.json({ ok: true, respuesta: payload });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, respuesta: data });
  } catch {
    devRespuestasEvaluacion.push(payload);
    return NextResponse.json({ ok: true, respuesta: payload });
  }
}
