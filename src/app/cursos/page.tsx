import { MainLayout } from "@/components/MainLayout";
import { Clock, Users, BookOpen, Star } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CursoRow = Record<string, unknown>;

function getCursoTitle(curso: CursoRow) {
  const v = curso.titulo ?? curso.title ?? curso.nombre ?? curso.name;
  return typeof v === "string" && v.trim() ? v : "Curso sin título";
}

function getCursoDescription(curso: CursoRow) {
  const v = curso.descripcion ?? curso.description ?? curso.detalle ?? curso.details;
  return typeof v === "string" && v.trim() ? v : "Sin descripción.";
}

function getCursoLevel(curso: CursoRow) {
  const v = curso.nivel ?? curso.level;
  return typeof v === "string" && v.trim() ? v : "—";
}

function getCursoDuration(curso: CursoRow) {
  const v = curso.duracion ?? curso.duration;
  return typeof v === "string" && v.trim() ? v : "—";
}

function getCursoProfessor(curso: CursoRow) {
  const v = curso.profesor ?? curso.teacher ?? curso.docente;
  return typeof v === "string" && v.trim() ? v : "Profesor";
}

export default async function CursosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let cursos: CursoRow[] = [];
  let cursosCount = 0;
  let hasActive = false;
  let hasPending = false;
  let disponibles: Array<{ id: string; titulo: string }> = [];

  if (user?.id) {
    const { data: insc } = await supabase
      .from("cursos_alumnos")
      .select("curso_id, estado")
      .eq("user_id", user.id)
      .limit(100);
    const estados = Array.isArray(insc) ? insc.map((r: any) => r.estado) : [];
    hasActive = estados.includes("activo");
    hasPending = estados.includes("pendiente");
    const idsInsc = Array.isArray(insc) ? insc.map((r: any) => r.curso_id).filter((id) => id != null) : [];
    cursosCount = idsInsc.length;

    if (idsInsc.length > 0) {
      const { data } = await supabase
        .from("cursos")
        .select("*")
        .in("id", idsInsc)
        .order("orden", { ascending: true })
        .limit(100);
      cursos = Array.isArray(data) ? data as CursoRow[] : [];
    } else {
      const { data } = await supabase
        .from("cursos")
        .select("id, titulo")
        .order("orden", { ascending: true })
      .limit(100);
      disponibles = Array.isArray(data)
        ? (data as any[]).map((c) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso") }))
        : [];
    }
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Mis Cursos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Continúa tu aprendizaje y alcanza tus objetivos profesionales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cursos Activos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{cursosCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Progreso Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">—</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Horas Completadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">—</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {!hasActive && !hasPending ? (
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
              {disponibles.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No hay cursos disponibles por el momento.
                </div>
              ) : (
                disponibles.map((c) => (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasPending && (
              <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
                Tu solicitud fue enviada. Todas las opciones se habilitarán cuando el admin apruebe tu inicio en el cursado.
              </div>
            )}
            {cursos.map((curso: any, idx: number) => (
              <div
                key={String(curso.id ?? `curso-${idx}`)}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-700 overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 rounded-full text-xs font-medium text-gray-900 dark:text-white">
                      {getCursoLevel(curso)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {getCursoTitle(curso)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {getCursoDescription(curso)}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {String(getCursoProfessor(curso)).slice(0, 1)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getCursoProfessor(curso)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{getCursoDuration(curso)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>—</span>
                    </div>
                  </div>

                  <a href={`/cursos/${encodeURIComponent(String(curso.id ?? ""))}`} className="block w-full">
                    <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    Ingresar al Curso
                    </button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
