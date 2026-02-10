 "use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { User, Activity, Users, BookOpen, DollarSign, Database, Settings, Search, Plus, Trash2, CheckCircle, AlertTriangle, FileText, Send, ArrowLeft, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Link from "next/link";

type EvaluacionRow = {
  id: string;
  title: string;
  course_name: string | null;
  created_at: string;
  questions_count: number;
};

type CursoRow = {
  id: string;
  titulo: string;
};

export default function AdminEvaluacionesPage() {
  const { user } = useAuth();
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [tipoEvaluacion, setTipoEvaluacion] = useState("general");
  const [materialId, setMaterialId] = useState("");
  const [unidadNombre, setUnidadNombre] = useState("");
  const [questions, setQuestions] = useState<{ q: string; options: string[]; correct: number }[]>([
    { q: "", options: ["", "", "", ""], correct: 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/evaluaciones", { cache: "no-store" });
      const json = await res.json();
      setEvaluaciones(Array.isArray(json.evaluaciones) ? json.evaluaciones : []);
      setCursos(Array.isArray(json.cursos) ? json.cursos : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { q: "", options: ["", "", "", ""], correct: 0 }]);
  };

  const handleQuestionChange = (idx: number, field: string, value: any) => {
    const newQuestions = [...questions];
    if (field === "q") newQuestions[idx].q = value;
    if (field === "correct") newQuestions[idx].correct = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].options[oIdx] = value;
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!newTitle) {
      alert("Complete el título del examen");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          course_id: newCourseId || null,
          questions,
          tipo_evaluacion: tipoEvaluacion,
          material_id: tipoEvaluacion === "material" ? materialId : null,
          unidad: tipoEvaluacion === "unidad" ? unidadNombre : null
        }),
      });
      if (res.ok) {
        alert(newCourseId ? "Evaluación enviada a los alumnos" : "Evaluación guardada como borrador");
        setShowNew(false);
        setNewTitle("");
        setNewCourseId("");
        setTipoEvaluacion("general");
        setMaterialId("");
        setUnidadNombre("");
        setQuestions([{ q: "", options: ["", "", "", ""], correct: 0 }]);
        fetchData();
      } else {
        alert("Error al guardar");
      }
    } catch (e) {
      alert("Error de red");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string, courseId: string) => {
    if (!courseId) {
      alert("Seleccione un curso para enviar la evaluación");
      return;
    }
    try {
      const res = await fetch("/api/admin/evaluaciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, course_id: courseId }),
      });
      const json = await res.json().catch(() => null as any);
      if (res.ok && (json?.ok || json?.fallback)) {
        fetchData();
        alert("Evaluación enviada al curso seleccionado");
      } else {
        alert(json?.error || "No se pudo enviar la evaluación");
      }
    } catch {
      alert("Error al enviar la evaluación");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    try {
      const res = await fetch(`/api/admin/evaluaciones?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null as any);
      if (res.ok && (json?.ok || json?.fallback)) {
        fetchData();
      } else {
        alert(json?.error || "No se pudo eliminar la evaluación");
      }
    } catch (e) {
      alert("Error");
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
          <div className="mb-3">
            <Link href="/admin/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver al Dashboard
            </Link>
          </div>
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-50">
                <FileText className="w-5 h-5 mr-2 inline text-blue-400" />
                Gestión de Evaluaciones
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Crea exámenes, revísalos y envíalos a los alumnos
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <User className="w-5 h-5" />
              {user?.email || "Administrador"}
            </div>
          </header>

          {!showNew ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-slate-50">Evaluaciones Activas</h2>
                <button
                  onClick={() => setShowNew(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Evaluación
                </button>
              </div>

              {loading ? (
                <div className="text-center text-slate-400">Cargando...</div>
              ) : evaluaciones.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-white/5 rounded-xl">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  No hay evaluaciones creadas.
                </div>
              ) : (
                <div className="space-y-3">
                  {evaluaciones.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <div className="text-base font-medium text-slate-50">{ev.title}</div>
                        <div className="text-xs text-slate-400">
                          {ev.course_name ? (
                            <>Curso: {ev.course_name} • {ev.questions_count} preguntas</>
                          ) : (
                            <>Borrador (sin curso) • {ev.questions_count} preguntas</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.course_name ? (
                          <div className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/20 flex items-center gap-1">
                            <Send className="w-3 h-3" /> Enviada
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={newCourseId}
                              onChange={(e) => setNewCourseId(e.target.value)}
                              className="px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs text-slate-100"
                            >
                              <option value="">Seleccionar curso...</option>
                              {cursos.map((c) => (
                                <option key={c.id} value={c.id}>{c.titulo}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handlePublish(ev.id, newCourseId)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Enviar
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-medium text-slate-50 mb-4">Crear Nueva Evaluación</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Título del Examen</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:border-blue-500 outline-none"
                    placeholder="Ej: Parcial de Liquidación"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Asignar al Curso (opcional)</label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-slate-100 focus:border-blue-500 outline-none"
                  >
                    <option value="">Seleccionar curso...</option>
                    {cursos.map((c) => (
                      <option key={c.id} value={c.id}>{c.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-slate-300 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-400" />
                    Generar preguntas con IA desde PDF
                  </div>
                  {aiGenerating && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAiError(null);
                    setAiGenerating(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch("/api/evaluaciones/generar", { method: "POST", body: fd });
                      const json = await res.json();
                      if (!res.ok) {
                        throw new Error(json?.error || "Error al generar");
                      }
                      setNewTitle(json?.title || newTitle || "Examen automático");
                      const mapped = Array.isArray(json?.questions)
                        ? json.questions.map((q: any) => ({
                            q: q.question,
                            options: q.options,
                            correct: Number(q.correctAnswer ?? 0),
                          }))
                        : [];
                      if (mapped.length > 0) setQuestions(mapped);
                    } catch (e: any) {
                      setAiError(e?.message || "Error");
                    } finally {
                      setAiGenerating(false);
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-white/10 file:bg-white/10 file:text-slate-100 file:hover:bg-white/20"
                />
                {aiError && (
                  <div className="mt-2 text-xs text-red-400">{aiError}</div>
                )}
              </div>

              {/* Selección de tipo de evaluación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo de Evaluación</label>
                  <select
                    value={tipoEvaluacion}
                    onChange={(e) => setTipoEvaluacion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-slate-100 focus:border-blue-500 outline-none"
                  >
                    <option value="general">Evaluación General</option>
                    <option value="material">Por Material Específico</option>
                    <option value="unidad">Por Unidad Completa</option>
                  </select>
                </div>
                {tipoEvaluacion === "material" && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">ID del Material</label>
                    <input
                      type="text"
                      value={materialId}
                      onChange={(e) => setMaterialId(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:border-blue-500 outline-none"
                      placeholder="ID del material específico"
                    />
                  </div>
                )}
                {tipoEvaluacion === "unidad" && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nombre de la Unidad</label>
                    <input
                      type="text"
                      value={unidadNombre}
                      onChange={(e) => setUnidadNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:border-blue-500 outline-none"
                      placeholder="Ej: Unidad 1 - Liquidación"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-6 mb-8">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex justify-between mb-2">
                      <label className="text-xs text-blue-400 font-bold">Pregunta {idx + 1}</label>
                      {questions.length > 1 && (
                        <button
                          onClick={() => {
                            const n = [...questions];
                            n.splice(idx, 1);
                            setQuestions(n);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={q.q}
                      onChange={(e) => handleQuestionChange(idx, "q", e.target.value)}
                      className="w-full mb-3 px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100"
                      placeholder="Escribe la pregunta..."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correct === oIdx}
                            onChange={() => handleQuestionChange(idx, "correct", oIdx)}
                            className="accent-blue-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                            className="flex-1 px-3 py-1 bg-transparent border border-white/10 rounded text-sm text-slate-300"
                            placeholder={`Opción ${oIdx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddQuestion}
                  className="w-full py-2 border border-dashed border-white/20 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
                >
                  + Agregar Pregunta
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Guardando..." : (newCourseId ? "Crear y Enviar" : "Guardar borrador")}
                </button>
              </div>
            </div>
          )}
        </div>
    </AdminLayout>
  );
}
