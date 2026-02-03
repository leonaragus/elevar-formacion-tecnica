import { MainLayout } from "@/components/MainLayout";
import { FileText, Download, Eye, Calendar } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devMateriales } from "@/lib/devstore";
import { cookies } from "next/headers";

const materialesPlaceholder = [
  {
    id: 1,
    curso_id: "1",
    titulo: "Introducción a JavaScript - Módulo 1",
    curso: "Programación Web Full Stack",
    tipo: "PDF",
    tamaño: "2.4 MB",
    fecha: "15 Ene 2026",
    descargas: 45,
  },
  {
    id: 2,
    curso_id: "1",
    titulo: "Guía de React Hooks",
    curso: "Programación Web Full Stack",
    tipo: "PDF",
    tamaño: "1.8 MB",
    fecha: "20 Ene 2026",
    descargas: 32,
  },
  {
    id: 3,
    curso_id: "3",
    titulo: "Principios de Diseño UX",
    curso: "Diseño UX/UI Profesional",
    tipo: "PDF",
    tamaño: "5.2 MB",
    fecha: "18 Ene 2026",
    descargas: 28,
  },
  {
    id: 4,
    curso_id: "4",
    titulo: "SQL Avanzado - Ejercicios",
    curso: "Base de Datos y SQL",
    tipo: "PDF",
    tamaño: "1.2 MB",
    fecha: "22 Ene 2026",
    descargas: 51,
  },
];

export default async function MaterialesPage({ searchParams }: { searchParams?: { curso_id?: string } }) {
  const cookieStore = await cookies();
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let selectedId = String(searchParams?.curso_id ?? "");
  const site = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  let hasActive = false;
  let hasPending = false;
  let cursos: Array<{ id: string; titulo: string }> = [];
  let estadoCursoSeleccionado: "ninguno" | "pendiente" | "activo" = "ninguno";

  if (!user && studentOk && typeof studentCourseId === "string" && studentCourseId) {
    hasActive = true;
    selectedId = studentCourseId;
    estadoCursoSeleccionado = "activo";
  }

  if (user?.id) {
    const { data: insc } = await supabase
      .from("cursos_alumnos")
      .select("curso_id, estado")
      .eq("user_id", user.id)
      .limit(20);
    const estados = Array.isArray(insc) ? insc.map((r: any) => r.estado) : [];
    hasActive = estados.includes("activo");
    hasPending = estados.includes("pendiente");
    const activeRow = Array.isArray(insc) ? (insc as any[]).find((r) => r?.estado === "activo" && r?.curso_id != null) : null;
    const activeCourseId = activeRow?.curso_id != null ? String(activeRow.curso_id) : "";
    if (hasActive && activeCourseId) {
      if (!selectedId || selectedId !== activeCourseId) selectedId = activeCourseId;
      estadoCursoSeleccionado = "activo";
    }
    if (selectedId) {
      const row = Array.isArray(insc) ? (insc as any[]).find((r) => String(r.curso_id) === selectedId) : null;
      const e = row?.estado;
      if (e === "pendiente") estadoCursoSeleccionado = "pendiente";
      if (e === "activo") estadoCursoSeleccionado = "activo";
    }
    if (!hasActive && !hasPending && !selectedId) {
      const { data, error } = await supabase
        .from("cursos")
        .select("id, titulo")
        .order("orden", { ascending: true })
        .limit(50);
      if (!error && Array.isArray(data) && data.length > 0) {
        cursos = (data as any[]).map((c) => ({
          id: String(c.id),
          titulo: String(c.titulo ?? "Curso"),
        }));
      } else {
        const res = await fetch(`${site}/api/admin/cursos?public=1`, { cache: "no-store", headers: { "x-public": "1" } }).catch(() => null as any);
        const json = await res?.json().catch(() => null as any);
        const list = Array.isArray(json?.cursos) ? json.cursos : [];
        cursos = list.map((c: any) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso") }));
      }
    }
  }
  const baseList = [...materialesPlaceholder, ...devMateriales];
  const listFiltrada = selectedId
    ? baseList.filter((m) => String(m.curso_id) === selectedId)
    : baseList;
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Materiales de Estudio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Accede a todos los recursos educativos de tus cursos
          </p>
        </div>

        {!selectedId && !hasActive && !hasPending ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Selecciona tu curso para solicitar acceso
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Elige el curso al que estás anotado. Luego el administrador aprobará tu inicio.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {cursos.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No hay cursos disponibles por el momento.
                </div>
              ) : (
                cursos.map((c) => (
                  <form
                    key={c.id}
                    action="/api/alumno/inscripcion"
                    method="POST"
                    className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input type="hidden" name="curso_id" value={c.id} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{c.titulo}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{c.id}</div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      Solicitar inscripción
                    </button>
                  </form>
                ))
              )}
            </div>
          </div>
        ) : selectedId && estadoCursoSeleccionado === "ninguno" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Solicita tu inscripción a este curso
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                El administrador aprobará tu inicio y se habilitarán las opciones.
              </p>
            </div>
            <div className="p-6">
              <form action="/api/alumno/inscripcion" method="POST" className="flex gap-3">
                <input type="hidden" name="curso_id" value={selectedId} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Solicitar inscripción
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {(hasPending || estadoCursoSeleccionado === "pendiente") && (
              <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300 mb-6">
                Tu solicitud fue enviada. Todas las opciones se habilitarán cuando el admin apruebe tu inicio en el cursado.
              </div>
            )}
            <div className="space-y-4">
              {listFiltrada.map((material) => (
                <div
                  key={material.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {material.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {material.curso}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {material.fecha}
                          </span>
                          <span>{material.tipo}</span>
                          <span>{material.tamaño}</span>
                          <span>{material.descargas} descargas</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={estadoCursoSeleccionado === "pendiente"}
                        className={`p-2 rounded-lg transition-colors ${estadoCursoSeleccionado === "pendiente" ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                        title={hasPending ? "Pendiente de aprobación" : "Ver"}
                      >
                        <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        disabled={estadoCursoSeleccionado === "pendiente"}
                        className={`p-2 rounded-lg transition-colors ${estadoCursoSeleccionado === "pendiente" ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
                        title={hasPending ? "Pendiente de aprobación" : "Descargar"}
                      >
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
