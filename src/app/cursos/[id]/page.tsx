import { MainLayout } from "@/components/MainLayout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BookOpen, CheckCircle, AlertTriangle } from "lucide-react";

type CursoRow = Record<string, unknown>;

function getCursoTitle(curso: CursoRow) {
  const v = curso.titulo ?? curso.title ?? curso.nombre ?? curso.name;
  return typeof v === "string" && v.trim() ? v : "Curso sin título";
}

function getCursoDescription(curso: CursoRow) {
  const v = curso.descripcion ?? curso.description ?? curso.detalle ?? curso.details;
  return typeof v === "string" && v.trim() ? v : "Sin descripción.";
}

export default async function CursoDetallePage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const id = String(params.id);

  const { data: curso } = await supabase
    .from("cursos")
    .select("*")
    .eq("id", id)
    .limit(1)
    .single();

  let estado: "ninguno" | "pendiente" | "activo" = "ninguno";
  if (user?.id) {
    const { data: insc } = await supabase
      .from("cursos_alumnos")
      .select("estado")
      .eq("user_id", user.id)
      .eq("curso_id", id)
      .limit(1);
    const e = Array.isArray(insc) && insc[0]?.estado;
    if (e === "pendiente") estado = "pendiente";
    if (e === "activo") estado = "activo";
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getCursoTitle(curso ?? {})}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {getCursoDescription(curso ?? {})}
          </p>
        </div>

        {estado === "ninguno" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-300 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  No estás inscripto en este curso
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Solicita tu inscripción para que el administrador pueda aprobar tu inicio.
                </p>
              </div>
            </div>
            <div className="p-6">
              <form action="/api/alumno/inscripcion" method="POST" className="flex gap-3">
                <input type="hidden" name="curso_id" value={id} />
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
            {estado === "pendiente" && (
              <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span>
                  Tu solicitud fue enviada. Todas las opciones se habilitarán cuando el admin apruebe tu inicio en el cursado.
                </span>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recursos del curso
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`/materiales?curso_id=${encodeURIComponent(id)}`} className="inline-block">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                    Materiales
                  </button>
                </a>
                <a href={`/evaluaciones?curso_id=${encodeURIComponent(id)}`} className="inline-block">
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
                    Evaluaciones
                  </button>
                </a>
                <a href={`/pagos?curso_id=${encodeURIComponent(id)}`} className="inline-block">
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                    Pagos
                  </button>
                </a>
                {estado === "activo" && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Acceso habilitado
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
