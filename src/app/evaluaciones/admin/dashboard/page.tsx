"use client";

import { MainLayout } from "@/components/MainLayout";
import { useEffect, useState } from "react";

type Totals = { evaluaciones: number; respuestas: number };
type CursoStat = { course_name: string; count: number };
type EvalItem = { id: number; title: string; course_name: string | null; created_at: string };
type RespItem = { id: number; evaluacion_id: number; evaluacion_title: string | null; score: number | null; created_at: string };

export default function EvaluacionesDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals>({ evaluaciones: 0, respuestas: 0 });
  const [promedio, setPromedio] = useState<number | null>(null);
  const [cursos, setCursos] = useState<CursoStat[]>([]);
  const [recientesEvals, setRecientesEvals] = useState<EvalItem[]>([]);
  const [recientesResps, setRecientesResps] = useState<RespItem[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/evaluaciones/stats");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error");
        setTotals(json.totals || { evaluaciones: 0, respuestas: 0 });
        setPromedio(typeof json.promedio_score === "number" ? json.promedio_score : null);
        setCursos(Array.isArray(json.cursos) ? json.cursos : []);
        setRecientesEvals(Array.isArray(json.recientes_evaluaciones) ? json.recientes_evaluaciones : []);
        setRecientesResps(Array.isArray(json.recientes_respuestas) ? json.recientes_respuestas : []);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Panel docente
          </h1>
        </div>

        {loading && (
          <div className="text-gray-600 dark:text-gray-400">Cargando estadísticas...</div>
        )}
        {error && (
          <div className="text-red-600 dark:text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Evaluaciones</div>
                <div className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {totals.evaluaciones}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Respuestas</div>
                <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                  {totals.respuestas}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Promedio</div>
                <div className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {promedio != null ? promedio.toFixed(2) : "—"}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Cursos</div>
                <div className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {cursos.length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evaluaciones recientes</h2>
                <div className="space-y-3">
                  {recientesEvals.map((it) => (
                    <div key={it.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{it.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {it.course_name || "Sin curso"} • {new Date(it.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recientesEvals.length === 0 && (
                    <div className="text-gray-600 dark:text-gray-400">No hay evaluaciones recientes</div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Respuestas recientes</h2>
                <div className="space-y-3">
                  {recientesResps.map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {r.evaluacion_title || `Evaluación #${r.evaluacion_id}`}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {r.score != null ? `Score: ${r.score}` : "Sin calificar"} • {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recientesResps.length === 0 && (
                    <div className="text-gray-600 dark:text-gray-400">No hay respuestas recientes</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evaluaciones por curso</h2>
              <div className="space-y-2">
                {cursos.map((c) => (
                  <div key={c.course_name} className="flex items-center justify-between">
                    <div className="text-gray-900 dark:text-white">{c.course_name}</div>
                    <div className="text-gray-600 dark:text-gray-400">{c.count}</div>
                  </div>
                ))}
                {cursos.length === 0 && (
                  <div className="text-gray-600 dark:text-gray-400">No hay cursos con evaluaciones</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
