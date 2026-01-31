import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // Totales
  const { count: evaluacionesCount } = await supabase
    .from("evaluaciones")
    .select("*", { count: "exact", head: true });

  const { count: respuestasCount } = await supabase
    .from("evaluaciones_respuestas")
    .select("*", { count: "exact", head: true });

  // Promedio de score
  const { data: scoresData, error: scoresError } = await supabase
    .from("evaluaciones_respuestas")
    .select("score")
    .not("score", "is", null)
    .limit(10000);
  const scores = Array.isArray(scoresData) ? scoresData.map((r: any) => Number(r.score)).filter((n) => !Number.isNaN(n)) : [];
  const promedioScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Cursos (conteo por course_name)
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

  // Recientes evaluaciones
  const { data: recientesEvaluaciones, error: evalsErr } = await supabase
    .from("evaluaciones")
    .select("id,title,course_name,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Ingresos alumnos
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

  // Intereses
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

  // Recientes respuestas + título de evaluación
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
}
