
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  FileText, 
  Settings, 
  Upload, 
  Download, 
  Trash2, 
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  File,
  Move,
  Copy,
  MoreVertical,
  Loader
} from "lucide-react";
import Link from "next/link";

type Tab = "overview" | "alumnos" | "materiales" | "evaluaciones";

interface AdminCursoDetailClientProps {
  id: string;
}

export function AdminCursoDetailClient({ id }: AdminCursoDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [glossaries, setGlossaries] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [lastUploadGlossaryUrl, setLastUploadGlossaryUrl] = useState<string | null>(null);
  const [lastUploadGlossaryError, setLastUploadGlossaryError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<any>(null);
  const [targetCursoId, setTargetCursoId] = useState("");
  const [cursosList, setCursosList] = useState<any[]>([]);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const resCursos = await fetch("/api/admin/cursos", { cache: "no-store" });
      const jsonCursos = await resCursos.json();
      const foundCourse = jsonCursos.cursos?.find((c: any) => c.id === id);
      setCourse(foundCourse || { id, titulo: "Curso no encontrado" });
      setStudents(jsonCursos.alumnos?.filter((a: any) => a.curso_id === id) || []);

      const resMat = await fetch(`/api/admin/materiales?curso_id=${id}`, { cache: "no-store" });
      const jsonMat = await resMat.json();
      setMaterials(jsonMat.items || []);

      // Fetch glossaries directly from Storage (public)
      try {
        const { data: files, error } = await supabase.storage.from("materiales").list(`${id}/glosarios`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (!error && Array.isArray(files)) {
          const mapped = files.map((f: any) => {
            const url = supabase.storage.from("materiales").getPublicUrl(`${id}/glosarios/${f.name}`).data.publicUrl;
            const title = f.name.replace(/\.md$/i, "").split('-').slice(1).join('-');
            return { name: f.name, url, title, size: f.metadata?.size, created_at: f.created_at };
          });
          setGlossaries(mapped);
        } else {
          setGlossaries([]);
        }
      } catch (e) {
        console.error(e);
        setGlossaries([]);
      }

      const resEval = await fetch(`/api/admin/evaluaciones`, { cache: "no-store" });
      const jsonEval = await resEval.json();
      setEvaluations(jsonEval.evaluaciones?.filter((e: any) => e.course_name === foundCourse?.titulo || e.course_id === id) || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("curso_id", id);
      fd.append("file", uploadFile);
      if (uploadTitle) fd.append("titulo", uploadTitle);
      
      const res = await fetch("/api/admin/materiales", { method: "POST", body: fd });
      let json;
      try {
        json = await res.json();
      } catch (e) {
        console.error("Error parsing JSON response", e);
      }

      if (res.ok && json?.ok) {
        setUploadFile(null);
        setUploadTitle("");
        setLastUploadGlossaryUrl(typeof json?.glossary_url === "string" ? json.glossary_url : null);
        setLastUploadGlossaryError(typeof json?.glossary_error === "string" ? json.glossary_error : null);
        if (json?.glossary_url) {
          alert("Material subido correctamente. Glosario generado.");
        } else if (json?.glossary_error) {
          alert(`Material subido correctamente. Glosario: ${json.glossary_error}`);
        } else {
          alert("Material subido correctamente");
        }
        fetchData();
      } else {
        const errorMsg = json?.error || res.statusText || "Error desconocido";
        console.error("Upload error:", errorMsg);
        alert(`Error al subir: ${errorMsg}`);
      }
    } catch (e: any) {
      console.error("Network error:", e);
      alert(`Error de red: ${e.message || "Intente nuevamente"}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterial = async (name: string) => {
    if (!confirm("¿Eliminar este material?")) return;
    try {
      const key = name.includes("/") ? name : `${id}/${name}`;
      const res = await fetch(`/api/admin/materiales?curso_id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) {
        alert(json?.error || "No se pudo eliminar");
        return;
      }
      setMaterials((prev) => prev.filter((m: any) => String(m?.name || "") !== String(name)));
    } catch (e: any) {
      alert(e?.message || "Error");
    }
  };

  const deleteGlossary = async (name: string) => {
    if (!confirm("¿Eliminar este glosario?")) return;
    try {
      const key = name.includes("/") ? name : `${id}/glosarios/${name}`;
      const res = await fetch(`/api/admin/materiales?curso_id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}&also_delete_glossary=0`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) {
        alert(json?.error || "No se pudo eliminar");
        return;
      }
      setGlossaries((prev) => prev.filter((g: any) => String(g?.name || "") !== String(name)));
    } catch (e: any) {
      alert(e?.message || "Error");
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Cargando detalles del curso...</div>;
  }

  if (!course) {
    return <div className="p-8 text-red-400">Curso no encontrado</div>;
  }

  return (
    <div className="p-4 md:p-8 text-slate-100 min-h-screen">
      <div className="mb-8">
        <Link href="/admin/cursos" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a Cursos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-50">{course.titulo}</h1>
            <p className="text-slate-400 mt-1 max-w-2xl">{course.descripcion}</p>
          </div>
          <div className="flex gap-2">
             <span className={`px-3 py-1 rounded-full text-xs border ${
                course.estado === 'activo' ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'
             }`}>
                {course.estado}
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-50">{students.length}</div>
              <div className="text-xs text-slate-400">Alumnos Inscriptos</div>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-50">{materials.length}</div>
              <div className="text-xs text-slate-400">Materiales Cargados</div>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-50">{evaluations.length}</div>
              <div className="text-xs text-slate-400">Evaluaciones Activas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 mb-6">
        <nav className="flex gap-6">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "overview" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Visión General
          </button>
          <button 
            onClick={() => setActiveTab("alumnos")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "alumnos" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Alumnos ({students.length})
          </button>
          <button 
            onClick={() => setActiveTab("materiales")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "materiales" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Materiales ({materials.length})
          </button>
          <button 
            onClick={() => setActiveTab("evaluaciones")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "evaluaciones" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Evaluaciones ({evaluations.length})
          </button>
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Detalles del Curso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <label className="text-xs text-slate-400">Título</label>
                  <div className="text-slate-200">{course.titulo}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">ID del Curso</label>
                  <div className="text-slate-200 font-mono text-xs">{course.id}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Modalidad</label>
                  <div className="text-slate-200 capitalize">{course.modalidad}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Duración</label>
                  <div className="text-slate-200">{course.duracion}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Precio</label>
                  <div className="text-slate-200">${course.precio?.toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Categoría</label>
                  <div className="text-slate-200">{course.categoria}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "alumnos" && (
          <div>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="p-4 font-medium">Alumno</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Fecha Inscripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        No hay alumnos inscriptos aún.
                      </td>
                    </tr>
                  ) : (
                    students.map((student: any, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="p-4 font-medium text-slate-200">
                          {student.nombre} {student.apellido}
                        </td>
                        <td className="p-4 text-slate-400">{student.email}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/20">
                            Activo
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(student.created_at || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "materiales" && (
          <div className="space-y-6">
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Subir Nuevo Material
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-400 mb-1 block">Título del archivo (opcional)</label>
                  <input 
                    type="text" 
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Ej: Guía de Estudio Módulo 1"
                    className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-400 mb-1 block">Seleccionar archivo</label>
                  <input 
                    type="file" 
                    accept="application/pdf,.pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                  />
                </div>
                <div>
                  <button 
                    onClick={handleUpload}
                    disabled={!uploadFile || uploading}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {uploading ? "Subiendo..." : "Subir Material"}
                  </button>
                </div>
              </div>

              {(lastUploadGlossaryUrl || lastUploadGlossaryError) && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-medium text-slate-100 mb-2">Glosario generado</div>
                  {lastUploadGlossaryError && (
                    <div className="text-xs text-amber-300 mb-2 break-words">{lastUploadGlossaryError}</div>
                  )}
                  {lastUploadGlossaryUrl ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/glosario?url=${encodeURIComponent(lastUploadGlossaryUrl)}`}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs"
                      >
                        Ver glosario
                      </Link>
                      <Link
                        href={`${lastUploadGlossaryUrl}?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                      >
                        Descargar
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">No se generó un archivo de glosario.</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((mat: any, i) => (
                <div key={i} className="group bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-xl p-4 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <File className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <button
                      onClick={() => deleteMaterial(String(mat.name || ""))}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-300 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-medium text-slate-200 truncate mb-1" title={mat.name}>
                    {mat.name.split('/').pop()}
                  </h4>
                  <div className="text-xs text-slate-500 mb-4">
                    {mat.size ? `${(mat.size / 1024 / 1024).toFixed(2)} MB` : 'Tamaño desc.'}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
                    <span>Subido: Hoy</span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" /> 0 descargas
                    </span>
                  </div>
                </div>
              ))}
              {materials.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-white/10 rounded-xl">
                  No hay materiales subidos para este curso.
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Glosarios Generados
              </h3>
              {glossaries.length === 0 ? (
                <div className="text-slate-400 text-sm">Aún no se han generado glosarios.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {glossaries.map((g, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="font-medium text-slate-200 mb-2 break-all">{g.title || g.name}</div>
                      <div className="text-xs text-slate-500 mb-4">{g.size ? `${(g.size/1024).toFixed(1)} KB` : 'Tamaño desc.'}</div>
                      <div className="flex items-center gap-2">
                        <Link href={`/glosario?url=${encodeURIComponent(String(g.url || ""))}`} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs">Ver</Link>
                        <Link href={`${g.url}?download=1`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs">Descargar</Link>
                        <button
                          onClick={() => deleteGlossary(String(g.name || ""))}
                          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded-lg text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "evaluaciones" && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-50">Evaluaciones del Curso</h3>
                <Link href="/admin/evaluaciones" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                  Gestionar Evaluaciones
                </Link>
             </div>
             
             <div className="grid gap-4">
                {evaluations.length === 0 ? (
                   <div className="p-8 text-center text-slate-400 bg-white/5 rounded-xl border border-white/10">
                      No hay evaluaciones asignadas a este curso.
                   </div>
                ) : (
                   evaluations.map((ev: any, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                         <div>
                            <div className="font-medium text-slate-200">{ev.title}</div>
                            <div className="text-xs text-slate-400">{ev.questions_count} preguntas</div>
                         </div>
                         <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                               <CheckCircle className="w-4 h-4 text-green-500" />
                               Activa
                            </span>
                         </div>
                      </div>
                   ))
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
