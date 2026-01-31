"use client";

import { MainLayout } from "@/components/MainLayout";
import { ClipboardCheck, Clock, CheckCircle, AlertCircle, Upload, FileText, Loader2, Play, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const evaluacionesPlaceholder = [
  {
    id: 1,
    titulo: "Examen Final - JavaScript",
    curso: "Programación Web Full Stack",
    tipo: "Examen",
    estado: "pendiente",
    fechaLimite: "28 Feb 2026",
    duracion: "90 min",
    intentos: "1 de 3",
  },
  {
    id: 2,
    titulo: "Trabajo Práctico - Wireframes",
    curso: "Diseño UX/UI Profesional",
    tipo: "Trabajo Práctico",
    estado: "completado",
    fechaLimite: "20 Ene 2026",
    calificacion: 9.5,
  },
  {
    id: 3,
    titulo: "Quiz - Normalización de Bases de Datos",
    curso: "Base de Datos y SQL",
    tipo: "Quiz",
    estado: "pendiente",
    fechaLimite: "30 Ene 2026",
    duracion: "30 min",
    intentos: "0 de 2",
  },
  {
    id: 4,
    titulo: "Proyecto Final - App Mobile",
    curso: "Desarrollo Mobile con React Native",
    tipo: "Proyecto",
    estado: "en_revision",
    fechaLimite: "15 Feb 2026",
  },
];

export default function EvaluacionesPage() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (user?.id) {
        const { data: insc } = await supabase
          .from("cursos_alumnos")
          .select("estado")
          .eq("user_id", user.id)
          .limit(20);
        const estados = Array.isArray(insc) ? insc.map((r: any) => r.estado) : [];
        setHasActive(estados.includes("activo"));
        setHasPending(estados.includes("pendiente"));
      }
    };
    run();
  }, [user?.id]);

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
        icon: Clock,
        label: "Pendiente",
      },
      completado: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        icon: CheckCircle,
        label: "Completado",
      },
      en_revision: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        icon: AlertCircle,
        label: "En Revisión",
      },
    };
    return badges[estado as keyof typeof badges] || badges.pendiente;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Por favor, sube un archivo PDF.");
      return;
    }

    setSourceFilename(file.name);
    setIsGenerating(true);
    setError(null);
    setGeneratedExam(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/evaluaciones/generar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al generar el examen");
      }

      setGeneratedExam(data);
      if (data.mock) {
        setError("⚠️ Modo Demo: Se requiere API Key de OpenAI para generar preguntas reales del PDF.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveExam = async () => {
    if (!generatedExam) return;
    setSaving(true);
    try {
      const response = await fetch("/api/evaluaciones/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedExam.title || "Examen",
          questions: generatedExam.questions || [],
          courseName: courseName || null,
          sourceFilename,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al guardar la evaluación");
      }
      setError(null);
      setShowUploadModal(false);
      setGeneratedExam(null);
      setCourseName("");
      setSourceFilename(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Evaluaciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona tus exámenes y trabajos prácticos
            </p>
          </div>
          <button 
            onClick={() => setShowUploadModal(!showUploadModal)}
            disabled={!hasActive}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Upload size={20} />
            Crear Examen con IA
          </button>
        </div>

        {!hasActive ? (
          <div className="mb-8 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
            {hasPending
              ? "Tu solicitud de cursado está pendiente de aprobación. Cuando sea aceptada, podrás ver y generar evaluaciones."
              : "Debes seleccionar tu curso y esperar la aceptación para acceder a Evaluaciones."}
          </div>
        ) : null}

        {hasActive && showUploadModal && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-500" />
              Generar Examen Automático
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sube un archivo PDF de tu clase (apuntes, libros, diapositivas) y nuestra IA generará automáticamente un examen de 15 preguntas multiple choice.
            </p>
            
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload}
                disabled={isGenerating}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {isGenerating ? (
                <div className="text-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Leyendo PDF y generando preguntas...</p>
                  <p className="text-xs text-gray-500 mt-1">Esto puede tardar unos segundos</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Haz clic o arrastra tu PDF aquí</p>
                  <p className="text-xs text-gray-500 mt-1">Máximo 10MB</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {generatedExam && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Examen Generado: {generatedExam.title || "Sin título"}
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Curso (opcional)"
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleSaveExam}
                      disabled={saving}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      <Save size={16} />
                      {saving ? "Guardando..." : "Guardar y Asignar"}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {generatedExam.questions?.map((q: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="font-semibold text-gray-900 dark:text-white mb-3">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-2 pl-4">
                        {q.options?.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className={`flex items-center gap-2 text-sm ${optIdx === q.correctAnswer ? "text-green-600 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${optIdx === q.correctAnswer ? "border-green-600 bg-green-100" : "border-gray-400"}`}>
                              {optIdx === q.correctAnswer && <div className="w-2 h-2 rounded-full bg-green-600" />}
                            </div>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {hasActive && (
        <div className="grid gap-4">
          {evaluacionesPlaceholder.map((evaluacion) => {
            const badge = getEstadoBadge(evaluacion.estado);
            const Icon = badge.icon;

            return (
              <div
                key={evaluacion.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      <ClipboardCheck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {evaluacion.titulo}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.bg} ${badge.text}`}
                        >
                          <Icon size={12} />
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {evaluacion.curso} • {evaluacion.tipo}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Vence: {evaluacion.fechaLimite}
                        </span>
                        {evaluacion.duracion && (
                          <span>Duración: {evaluacion.duracion}</span>
                        )}
                        {evaluacion.calificacion && (
                          <span className="font-medium text-green-600 dark:text-green-400">
                            Nota: {evaluacion.calificacion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {evaluacion.estado === "pendiente" ? (
                      <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full md:w-auto justify-center">
                        <Play size={16} />
                        Comenzar
                      </button>
                    ) : (
                      <button className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm w-full md:w-auto text-center">
                        Ver Detalles
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </MainLayout>
  );
}
