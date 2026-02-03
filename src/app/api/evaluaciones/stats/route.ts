import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devEvaluaciones, devRespuestasEvaluacion, devIntereses } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = await createSupabaseServerClient();

    const { count: evaluacionesCount } = await supabase
      .from("evaluaciones")
      .select("*", { count: "exact", head: true });

    const { count: respuestasCount } = await supabase
      .from("evaluaciones_respuestas")
      .select("*", { count: "exact", head: true });

    const { data: scoresData, error: scoresError } = await supabase
      .from("evaluaciones_respuestas")
      .select("score")
      .not("score", "is", null)
      .limit(10000);
    const scores = Array.isArray(scoresData) ? scoresData.map((r: any) => Number(r.score)).filter((n) => !Number.isNaN(n)) : [];
    const promedioScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const { data: cursosData } = await supabase
      .from("evaluaciones")
      .select("course_name")
      .limit(10000);
    const cursosMap = new Map<string, number>();
    (Array.isArray(cursosData) ? cursosData : []).forEach((row: any) => {
      const key = row?.course_name ?? "Sin curso";
      cursosMap.set(key, (cursosMap.get(key) || 0) + 1);
    });
    const cursos = [...cursosMap.entries()].map(([course_name, count]) => ({ course_name, count }));

    const { data: recientesEvaluaciones, error: evalsErr } = await supabase
      .from("evaluaciones")
      .select("id,title,course_name,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    let ingresosTotal: number | null = null;
    let ingresosRecientes: any[] = [];
    try {
      const { count: ingresosCount } = await supabase
        .from("alumnos_ingresos")
        .select("*", { count: "exact", head: true });
      ingresosTotal = ingresosCount ?? null;
      const { data: ingresosData } = await supabase
        .from("alumnos_ingresos")
        .select("email,when")
        .order("when", { ascending: false })
        .limit(5);
      ingresosRecientes = Array.isArray(ingresosData) ? ingresosData : [];
    } catch {}

    let interesesPorCurso: Array<{ curso_id: string; count: number }> = [];
    try {
      const { data: interesesData } = await supabase
        .from("intereses")
        .select("curso_id")
        .limit(10000);
      const m = new Map<string, number>();
      (Array.isArray(interesesData) ? interesesData : []).forEach((r: any) => {
        const k = r?.curso_id ?? "desconocido";
        m.set(k, (m.get(k) || 0) + 1);
      });
      interesesPorCurso = [...m.entries()].map(([curso_id, count]) => ({ curso_id, count }));
    } catch {}

    const { data: recientesRespuestas } = await supabase
      .from("evaluaciones_respuestas")
      .select("id,evaluacion_id,score,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const evalIds = (Array.isArray(recientesRespuestas) ? recientesRespuestas : []).map((r: any) => r.evaluacion_id);
    const uniqueEvalIds = [...new Set(evalIds)].filter((id) => id != null);

    let evalTitleById: Record<string, string> = {};
    if (uniqueEvalIds.length > 0) {
      const { data: evalsForMap } = await supabase
        .from("evaluaciones")
        .select("id,title")
        .in("id", uniqueEvalIds);
      (Array.isArray(evalsForMap) ? evalsForMap : []).forEach((row: any) => {
        evalTitleById[String(row.id)] = row.title;
      });
    }

    const recientesRespuestasDecoradas = (Array.isArray(recientesRespuestas) ? recientesRespuestas : []).map((r: any) => ({
      id: r.id,
      evaluacion_id: r.evaluacion_id,
      evaluacion_title: evalTitleById[String(r.evaluacion_id)] || null,
      score: r.score,
      created_at: r.created_at,
    }));

    return NextResponse.json({
      totals: {
        evaluaciones: evaluacionesCount ?? 0,
        respuestas: respuestasCount ?? 0,
      },
      promedio_score: promedioScore,
      cursos,
      recientes_evaluaciones: Array.isArray(recientesEvaluaciones) ? recientesEvaluaciones : [],
      recientes_respuestas: recientesRespuestasDecoradas,
      ingresos_total: ingresosTotal,
      ingresos_recientes: ingresosRecientes,
      intereses_por_curso: interesesPorCurso,
      errors: {
        scoresError: scoresError?.message || null,
        evalsError: evalsErr?.message || null,
      },
    });
  } catch (e: any) {
    const scores = devRespuestasEvaluacion.map((r) => Number(r.score)).filter((n) => !Number.isNaN(n));
    const promedioScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const cursosMap = new Map<string, number>();
    devEvaluaciones.forEach((e) => {
      const key = e.course_name || "Sin curso";
      cursosMap.set(key, (cursosMap.get(key) || 0) + 1);
    });
    const cursos = [...cursosMap.entries()].map(([course_name, count]) => ({ course_name, count }));
    const recientes_evaluaciones = [...devEvaluaciones]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 5)
      .map((e) => ({ id: e.id, title: e.title, course_name: e.course_name, created_at: e.created_at }));
    const evalTitleById: Record<string, string> = {};
    devEvaluaciones.forEach((e) => { evalTitleById[e.id] = e.title; });
    const recientes_respuestas = devRespuestasEvaluacion
      .slice(-5)
      .reverse()
      .map((r) => ({
        id: `${r.evaluacion_id}-${r.created_at}`,
        evaluacion_id: r.evaluacion_id,
        evaluacion_title: evalTitleById[r.evaluacion_id] || null,
        score: r.score,
        created_at: r.created_at,
      }));
    const interesesCountMap = new Map<string, number>();
    devIntereses.forEach((i) => {
      const k = i.curso_id || "desconocido";
      interesesCountMap.set(k, (interesesCountMap.get(k) || 0) + 1);
    });
    const intereses_por_curso = [...interesesCountMap.entries()].map(([curso_id, count]) => ({ curso_id, count }));
    return NextResponse.json({
      totals: {
        evaluaciones: devEvaluaciones.length,
        respuestas: devRespuestasEvaluacion.length,
      },
      promedio_score: promedioScore,
      cursos,
      recientes_evaluaciones,
      recientes_respuestas,
      ingresos_total: null,
      ingresos_recientes: [],
      intereses_por_curso,
      errors: {
        scoresError: null,
        evalsError: null,
      },
    });
  }
}
