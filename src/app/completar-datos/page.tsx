'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CompletarDatosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const curso_id = searchParams.get('curso_id');
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const getUserData = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserEmail(user.email || '');
        setFormData({
          nombre: user.user_metadata?.nombre || '',
          apellido: user.user_metadata?.apellido || '',
          documento: user.user_metadata?.documento || '',
          telefono: user.user_metadata?.telefono || '',
          direccion: user.user_metadata?.direccion || '',
          fecha_nacimiento: user.user_metadata?.fecha_nacimiento || '',
        });
      }
    };
    
    getUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      setError('Nombre y apellido son obligatorios');
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          documento: formData.documento.trim(),
          telefono: formData.telefono.trim(),
          direccion: formData.direccion.trim(),
          fecha_nacimiento: formData.fecha_nacimiento.trim(),
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Si hay un curso_id, redirigir a la inscripción
      if (curso_id) {
        // Realizar la inscripción automáticamente
        const response = await fetch('/api/alumno/inscripcion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ curso_id }),
        });

        if (response.ok) {
          router.push('/cursos?solicitud=pendiente');
        } else {
          const result = await response.json();
          throw new Error(result.error || 'Error al realizar la inscripción');
        }
      } else {
        // Si no hay curso_id, redirigir al perfil
        router.push('/perfil?actualizado=true');
      }

    } catch (err: any) {
      setError(err.message || 'Error al guardar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Completa tus datos
          </h1>
          <p className="text-gray-600 mt-2">
            Necesitamos algunos datos básicos para continuar
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-1">
              Email: {userEmail}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">
              Apellido *
            </label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              required
              value={formData.apellido}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tu apellido"
            />
          </div>

          <div>
            <label htmlFor="documento" className="block text-sm font-medium text-gray-700">
              Documento
            </label>
            <input
              type="text"
              id="documento"
              name="documento"
              value={formData.documento}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Número de documento"
            />
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Número de teléfono"
            />
          </div>

          <div>
            <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              id="fecha_nacimiento"
              name="fecha_nacimiento"
              value={formData.fecha_nacimiento}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <input
              type="text"
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tu dirección"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : curso_id ? 'Completar inscripción' : 'Guardar datos'}
          </button>

          {curso_id && (
            <button
              type="button"
              onClick={() => router.push('/cursos')}
              className="w-full text-gray-600 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar inscripción
            </button>
          )}
        </form>
      </div>
    </div>
  );
}