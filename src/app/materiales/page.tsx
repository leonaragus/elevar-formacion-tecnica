
import { MainLayout } from "@/components/MainLayout";
import { FileText, Download, Eye, Calendar, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureGlossaryForMaterial } from "@/lib/glossary/ensureGlossary";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function MaterialesPage(props: { searchParams: Promise<{ curso_id?: string }> }) {
  const searchParams = await props.searchParams;
  const resolvedSearchParams = searchParams;
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

  // 1. Check Cookie-based access (legacy/quick access)
  if (studentOk && typeof studentCourseId === "string" && studentCourseId) {
    hasActive = true;
    selectedId = studentCourseId;
    estadoCursoSeleccionado = "activo";
  }

  // 2. Check Database-based access (Supabase Auth)
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
    
    // Find active course (allow 'activo' or 'en_desarrollo' if the student is active)
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

    // If no active course, list available courses (include both active and in development)
    if (!hasActive && !hasPending && !selectedId) {
      const { data, error } = await supabase
        .from("cursos")
        .select("id, titulo")
        .in("estado", ["activo", "en_desarrollo"])
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
  let materialCandidates: Array<{ name: string; mimetype: string | null }> = [];
  let glosarios: Array<{ id: string; titulo: string; url: string; fecha: string; tamaño: string }> = [];
  if (selectedId && estadoCursoSeleccionado === "activo") {
     try {
       const adminClient = createSupabaseAdminClient();
       // Try listing with and without leading slash to be compatible with all storage versions
       const { data: fileList, error } = await adminClient.storage.from("materiales").list(selectedId, {
         limit: 100,
         sortBy: { column: "created_at", order: "desc" }
       });
       
       console.log("Storage list result:", { count: fileList?.length, error });

       if (fileList && !error) {
         // Filter out the 'glosarios' folder itself if it appears in the list
        const filtered = fileList.filter(
          (f) => f.name !== "glosarios" && f.name !== "_pending" && !f.metadata?.mimetype?.includes("directory")
        );

        materialCandidates = filtered.map((f: any) => ({
          name: String(f?.name || ""),
          mimetype: typeof f?.metadata?.mimetype === "string" ? String(f.metadata.mimetype) : null,
        }));

        materiales = filtered.map(file => {
            const publicUrl = adminClient.storage.from("materiales").getPublicUrl(`${selectedId}/${file.name}`).data.publicUrl;
            const nameParts = file.name.split('-');
            let displayName = file.name;
            if (nameParts.length > 1 && /^\d+$/.test(nameParts[0])) {
                displayName = nameParts.slice(1).join('-');
            }
            const createdAt = typeof file.created_at === "string" ? file.created_at : null;
            const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
            const isNew = Number.isFinite(createdMs) ? Date.now() - createdMs <= 3 * 24 * 60 * 60 * 1000 : false;
            
            return {
               id: file.id || file.name,
               curso_id: selectedId,
               titulo: displayName,
               curso: activeCourseTitle || "Curso Actual",
               tipo: file.metadata?.mimetype?.split('/')?.[1]?.toUpperCase() || "ARCHIVO",
               tamaño: file.metadata?.size ? `${(file.metadata.size / 1024 / 1024).toFixed(2)} MB` : "N/A",
               fecha: createdAt ? new Date(createdAt).toLocaleDateString() : "Hoy",
               descargas: 0,
               url: publicUrl,
               isNew,
               created_at: createdAt,
            };
         });
       }
     } catch (e) {
       console.error("Error fetching materials:", e);
     }

     // List glossaries
     try {
       const adminClient = createSupabaseAdminClient();
       const { data: glossList, error: glossErr } = await adminClient.storage.from("materiales").list(`${selectedId}/glosarios`, {
         limit: 50,
         sortBy: { column: "created_at", order: "desc" }
       });
       if (glossList && !glossErr) {
         const isPlaceholderMd = (t: string) => {
           const m = t.toLowerCase();
           return (
             m.includes("no se pudo extraer texto del pdf") ||
             m.includes("no se pudo extraer texto del archivo") ||
             m.includes("posible pdf escaneado") ||
             m.includes("se requiere ocr")
           );
         };
         const filtered: Array<{ id: string; titulo: string; url: string; fecha: string; tamaño: string }> = [];
         for (const file of glossList.filter((f) => String(f?.name || "").endsWith(".md"))) {
           const key = `${selectedId}/glosarios/${file.name}`;
           const dl = await adminClient.storage.from("materiales").download(key);
           if (dl?.error) continue;
           const blob = dl.data as Blob;
           const text = await blob.text();
           if (!text.trim()) continue;
           if (isPlaceholderMd(text)) continue;
           const publicUrl = adminClient.storage.from("materiales").getPublicUrl(key).data.publicUrl;
           const baseName = file.name.replace(/\.md$/i, "");
           const nameParts = baseName.split('-');
           let displayName = baseName;
           if (nameParts.length > 1 && /^\d+$/.test(nameParts[0])) {
             displayName = nameParts.slice(1).join('-');
           }
           filtered.push({
             id: file.id || file.name,
             titulo: displayName,
             url: publicUrl,
             fecha: file.created_at ? new Date(file.created_at).toLocaleDateString() : "Hoy",
             tamaño: file.metadata?.size ? `${(file.metadata.size/1024).toFixed(1)} KB` : "N/A",
           });
         }
         glosarios = filtered;
       }

      const existingGloss = new Map<string, number>();
      for (const f of glossList || []) {
        const n = String((f as any)?.name || "");
        const sz = Number((f as any)?.metadata?.size ?? 0);
        if (n) existingGloss.set(n, Number.isFinite(sz) ? sz : 0);
      }
      const bucket = "materiales";
      const candidates = materialCandidates;

      const missing = candidates
        .filter((c) => {
          const md = c.name.replace(/\.[^.]+$/, ".md");
          const size = existingGloss.get(md);
          return size == null || size === 0;
        })
        .slice(0, 1);

      if (missing.length > 0) {
        const results = await Promise.allSettled(
          missing.map((m) =>
            ensureGlossaryForMaterial({
              supabase: adminClient,
              bucket,
              cursoId: String(selectedId),
              materialName: m.name,
              materialMimeType: m.mimetype,
            })
          )
        );

        for (const r of results) {
          if (r.status === "fulfilled" && r.value?.ok && r.value?.glossaryUrl) {
            const gUrl = r.value.glossaryUrl;
            const gName = String(gUrl).split("/").pop() || "glosario.md";
            const key = `${selectedId}/glosarios/${gName}`;
            const dl = await adminClient.storage.from(bucket).download(key);
            if (dl?.error) continue;
            const text = await (dl.data as Blob).text();
            const isPlaceholderMd = (t: string) => {
              const m = t.toLowerCase();
              return (
                m.includes("no se pudo extraer texto del pdf") ||
                m.includes("no se pudo extraer texto del archivo") ||
                m.includes("posible pdf escaneado") ||
                m.includes("se requiere ocr")
              );
            };
            if (!text.trim() || isPlaceholderMd(text)) continue;
            const baseName = gName.replace(/\.md$/i, "");
            const parts = baseName.split("-");
            let displayName = baseName;
            if (parts.length > 1 && /^\d+$/.test(parts[0])) {
              displayName = parts.slice(1).join("-");
            }
            glosarios = [
              {
                id: gName,
                titulo: displayName,
                url: gUrl,
                fecha: new Date().toLocaleDateString(),
                tamaño: "N/A",
              },
              ...glosarios,
            ];
          }
        }
      }
     } catch (e) {
       console.error("Error fetching glossaries:", e);
     }
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SHOW_DEBUG === "1" && (
          <div className="mb-4 p-3 bg-black/20 rounded border border-white/10 text-[10px] font-mono text-slate-500">
            DEBUG: user_id={user?.id || "null"} | student_ok={String(studentOk)} | student_course_id={studentCourseId || "null"} | selectedId={selectedId} | estado={estadoCursoSeleccionado} | count={materiales.length}
          </div>
        )}
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
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-all">
                                    {material.titulo}
                                  </h3>
                                  {material.isNew && (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white">
                                      Nuevo
                                    </span>
                                  )}
                                </div>
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

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Glosarios</h2>
                  {glosarios.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Aún no hay glosarios generados para este curso.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {glosarios.map((g) => (
                        <div key={g.id} className="group rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:border-blue-500/40 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-base font-semibold text-gray-900 dark:text-white break-all">{g.titulo}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{g.fecha} · {g.tamaño}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/glosario?url=${encodeURIComponent(String(g.url || ""))}`} className="px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white">Ver</Link>
                              <Link href={`${g.url}?download=1`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white">Descargar</Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
