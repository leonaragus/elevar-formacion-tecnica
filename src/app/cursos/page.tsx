'use client';

import { MainLayout } from "@/components/MainLayout";
import { BookOpen, Bell, AlertCircle } from "lucide-react";
import CursoCard from "@/components/CursoCard";
import { useEffect, useState } from "react";

// FINAL, ROBUST IMPLEMENTATION
// This is a pure client component that fetches data from our new secure API route.
// It has no server-side code and is therefore immune to the previous crashes.

export default function CursosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursosActivos, setCursosActivos] = useState<any[]>([]);
  const [cursosPendientes, setCursosPendientes] = useState<any[]>([]);
  const [cursosDisponibles, setCursosDisponibles] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Handle error messages from the URL (e.g., expired magic link)
      const searchParams = new URLSearchParams(window.location.search);
      const errorDescription = searchParams.get("error_description");
      if (errorDescription) {
        // Translate Supabase's technical error into a clear, user-friendly message
        if (errorDescription.includes("expired")) {
          setError("El enlace de acceso ha caducado. Por favor, solicita uno nuevo.");
        } else if (errorDescription.includes("invalid")) {
          setError("El enlace de acceso es inválido. Por favor, solicita uno nuevo.");
        } else {
          setError(errorDescription);
        }
      }

      try {
        // Fetch all course data from our new, reliable API endpoint
        const response = await fetch('/api/cursos');
        if (!response.ok) {
          throw new Error('No se pudo cargar la información de los cursos.');
        }
        const data = await response.json();
        setCursosActivos(data.cursosActivos || []);
        setCursosPendientes(data.cursosPendientes || []);
        setCursosDisponibles(data.cursosDisponibles || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCursoProfessor = (curso: any) => {
    return curso.profesor ?? curso.teacher ?? curso.docente ?? "Profesor";
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5"/>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Cursos</h1>
            {!loading && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {cursosActivos.length > 0
                  ? `Tienes ${cursosActivos.length} curso${cursosActivos.length !== 1 ? "s" : ""} activo${cursosActivos.length !== 1 ? "s" : ""}`
                  : cursosPendientes.length > 0
                    ? "Tu inscripción está pendiente de aprobación"
                    : "Elige un curso para solicitar tu inscripción"}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando tus cursos...</p>
          </div>
        ) : (
          <>
            {cursosActivos.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Curso Activo</h2>
                <div className="grid grid-cols-1 gap-6">
                  {cursosActivos.map((curso) => (
                    <CursoCard
                      key={curso.id}
                      curso={curso}
                      professor={getCursoProfessor(curso)}
                      estadoCurso="activo"
                      isAdminView={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {cursosPendientes.length > 0 && (
               <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Cursos Pendientes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cursosPendientes.map((curso) => (
                    <CursoCard
                      key={curso.id}
                      curso={curso}
                      professor={getCursoProfessor(curso)}
                      estadoCurso="pendiente"
                      isAdminView={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {cursosDisponibles.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Cursos Disponibles</h2>
                <div className="grid grid-cols-1 gap-6">
                  {cursosDisponibles.map((curso) => (
                    <CursoCard
                      key={curso.id}
                      curso={curso}
                      professor={getCursoProfessor(curso)}
                      estadoCurso="ninguno"
                      isAdminView={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && cursosActivos.length === 0 && cursosPendientes.length === 0 && cursosDisponibles.length === 0 && !error && (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay cursos para mostrar</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Pronto se agregarán nuevos cursos.</p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
