
import { MainLayout } from "@/components/MainLayout";
import { FileText, Download, Eye, Calendar, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function MaterialesPage({ searchParams }: { searchParams?: Promise<{ curso_id?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let selectedId = String(resolvedSearchParams?.curso_id ?? "");
  
  // Logic to determine active course
  let hasActive = false;
  let hasPending = false;
  let cursos: Array<{ id: string; titulo: string }> = [];
  let estadoCursoSeleccionado: "ninguno" | "pendiente" | "activo" = "ninguno";
  let activeCourseTitle = "";

  if (!user && studentOk && typeof studentCourseId === "string" && studentCourseId) {
    hasActive = true;
    selectedId = studentCourseId;
    estadoCursoSeleccionado = "activo";
  }

  if (user?.id) {
    // Check by ID
    const { data: insc } = await supabase
      .from("cursos_alumnos")
      .select("curso_id, estado, cursos(titulo)")
      .eq("user_id", user.id)
      .limit(20);
    
    // Check by Email
    let inscEmail: any[] = [];
    if (user.email) {
       const { data } = await supabase
          .from("cursos_alumnos")
          .select("curso_id, estado, cursos(titulo)")
          .eq("user_id", user.email)
          .limit(20);
       if (data) inscEmail = data;
    }

    const allInsc = [...(Array.isArray(insc) ? insc : []), ...inscEmail];
    
    // Deduplicate by curso_id
    const uniqueInsc = Array.from(new Map(allInsc.map(item => [item.curso_id, item])).values());
    
    const estados = uniqueInsc.map((r: any) => r.estado);
    hasActive = estados.includes("activo");
    hasPending = estados.includes("pendiente");
    
    // Find active course
    const activeRow = uniqueInsc.find((r) => r?.estado === "activo" && r?.curso_id != null);
    const activeCourseId = activeRow?.curso_id != null ? String(activeRow.curso_id) : "";
    
    if (hasActive && activeCourseId) {
      if (!selectedId || selectedId !== activeCourseId) selectedId = activeCourseId;
      estadoCursoSeleccionado = "activo";
      activeCourseTitle = activeRow?.cursos?.titulo || "";
    }
    
    if (selectedId) {
      const row = uniqueInsc.find((r) => String(r.curso_id) === selectedId);
      const e = row?.estado;
      if (e === "pendiente") estadoCursoSeleccionado = "pendiente";
      if (e === "activo") {
          estadoCursoSeleccionado = "activo";
          activeCourseTitle = row?.cursos?.titulo || "";
      }
    }

    // If no active course, list available courses
    if (!hasActive && !hasPending && !selectedId) {
      const { data, error } = await supabase
        .from("cursos")
        .select("id, titulo")
        .eq("estado", "activo")
        .order("titulo", { ascending: true });
        
      if (!error && data) {
        cursos = data.map((c) => ({
          id: String(c.id),
          titulo: String(c.titulo ?? "Curso"),
        }));
      }
    }
  }

  // Fetch materials if we have a selected active course
  let materiales: any[] = [];
  if (selectedId && estadoCursoSeleccionado === "activo") {
     try {
       const { data: fileList, error } = await supabase.storage.from("materiales").list(selectedId, {
         limit: 100,
         sortBy: { column: "created_at", order: "desc" }
       });
       
       if (fileList && !error) {
         materiales = fileList.map(file => {
            const publicUrl = supabase.storage.from("materiales").getPublicUrl(`${selectedId}/${file.name}`).data.publicUrl;
            // Try to extract a clean title from "timestamp-name"
            const nameParts = file.name.split('-');
            let displayName = file.name;
            if (nameParts.length > 1 && /^\d+$/.test(nameParts[0])) {
                displayName = nameParts.slice(1).join('-');
            }
            
            return {
               id: file.id,
               curso_id: selectedId,
               titulo: displayName,
               curso: activeCourseTitle || "Curso Actual",
               tipo: file.metadata?.mimetype?.split('/')?.[1]?.toUpperCase() || "ARCHIVO",
               tamaño: file.metadata?.size ? `${(file.metadata.size / 1024 / 1024).toFixed(2)} MB` : "N/A",
               fecha: new Date(file.created_at).toLocaleDateString(),
               descargas: 0,
               url: publicUrl
            };
         });
       }
     } catch (e) {
       console.error("Error fetching materials:", e);
     }
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
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
                  No hay cursos disponibles para inscripción en este momento.
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
              <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Tu solicitud está pendiente de aprobación.
              </div>
            )}
            
            {estadoCursoSeleccionado === "activo" && (
                <div className="space-y-4">
                {materiales.length === 0 ? (
                     <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                         <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                             <FileText className="w-8 h-8 text-gray-400" />
                         </div>
                         <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay materiales aún</h3>
                         <p className="text-gray-500 dark:text-gray-400 text-sm">El profesor aún no ha cargado contenido para este curso.</p>
                     </div>
                ) : (
                    materiales.map((material) => (
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
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 break-all">
                                {material.titulo}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {material.curso}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {material.fecha}
                                </span>
                                <span>{material.tipo}</span>
                                <span>{material.tamaño}</span>
                                </div>
                            </div>
                            </div>
                            <div className="flex gap-2">
                            <Link
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Ver online"
                            >
                                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </Link>
                            <Link
                                href={`${material.url}?download=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                title="Descargar"
                            >
                                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </Link>
                            </div>
                        </div>
                        </div>
                    ))
                )}
                </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
