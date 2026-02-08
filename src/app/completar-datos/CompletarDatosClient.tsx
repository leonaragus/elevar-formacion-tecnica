"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompletarDatosClient({
  userEmail,
  cursoId,
  currentNombre,
  currentApellido
}: {
  userEmail: string;
  cursoId?: string;
  currentNombre: string;
  currentApellido: string;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: currentNombre,
    apellido: currentApellido
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: userEmail
        }),
      });

      if (response.ok) {
        // Si hay un curso_id, redirigir a la página del curso para completar la inscripción
        if (cursoId) {
          router.push(`/cursos/${cursoId}?solicitud=pendiente`);
        } else {
          router.push('/cursos?solicitud=pendiente');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Error al guardar los datos');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Si el usuario decide saltar, redirigir directamente al curso
    if (cursoId) {
      router.push(`/cursos/${cursoId}?solicitud=pendiente`);
    } else {
      router.push('/cursos');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Completa tus datos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Necesitamos conocer tu nombre y apellido para procesar tu solicitud de inscripción.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              id="nombre"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Apellido *
            </label>
            <input
              type="text"
              id="apellido"
              required
              value={formData.apellido}
              onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Tu apellido"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar y continuar'}
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Saltar
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            * Estos datos aparecerán en tu perfil y en las listas del administrador.
          </p>
        </div>
      </div>
    </div>
  );
}