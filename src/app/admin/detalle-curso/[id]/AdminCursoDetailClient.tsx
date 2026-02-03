
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
  File
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
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Get Course Info (from devstore or DB)
      // Since we don't have a direct single-course endpoint yet that returns everything, 
      // we'll try to reuse the list endpoint or fetch directly if we had server components.
      // For now, let's filter from the list endpoint as a quick fix, or better, make a specific call.
      // Actually, let's fetch from the list endpoint for now to be safe with existing logic.
      const resCursos = await fetch("/api/admin/cursos", { cache: "no-store" });
      const jsonCursos = await resCursos.json();
      const foundCourse = jsonCursos.cursos?.find((c: any) => c.id === id);
      setCourse(foundCourse || { id, titulo: "Curso no encontrado" });
      setStudents(jsonCursos.alumnos?.filter((a: any) => a.curso_id === id) || []);

      // 2. Get Materials
      const resMat = await fetch(`/api/admin/materiales?curso_id=${id}`, { cache: "no-store" });
      const jsonMat = await resMat.json();
      setMaterials(jsonMat.items || []);

      // 3. Get Evaluations
      const resEval = await fetch(`/api/admin/evaluaciones`, { cache: "no-store" });
      const jsonEval = await resEval.json();
      setEvaluations(jsonEval.evaluaciones?.filter((e: any) => e.course_name === foundCourse?.titulo || e.course_id === id) || []); // Note: linking by name or id might be tricky depending on how it was saved.

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
      if (res.ok) {
        setUploadFile(null);
        setUploadTitle("");
        alert("Material subido correctamente");
        fetchData(); // Refresh
      } else {
        alert("Error al subir");
      }
    } catch {
      alert("Error de red");
    } finally {
      setUploading(false);
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
      {/* Header */}
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

      {/* Stats Cards */}
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

      {/* Tabs */}
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

      {/* Tab Content */}
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
            {/* Upload Section */}
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
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((mat: any, i) => (
                <div key={i} className="group bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-xl p-4 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <File className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="flex gap-1">
                      {/* We could add delete/edit here later */}
                    </div>
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
