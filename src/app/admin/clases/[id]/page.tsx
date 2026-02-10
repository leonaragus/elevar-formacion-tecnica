// Página para ver una clase grabada individual
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function VerClasePage({ params }: PageProps) {
  const supabase = createSupabaseServerClient();

  // Obtener la clase grabada
  const { data: clase, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('id', params.id)
    .eq('activo', true)
    .single();

  if (error || !clase) {
    notFound();
  }

  // Obtener información del curso
  const { data: curso } = await supabase
    .from('cursos')
    .select('titulo')
    .eq('id', clase.curso_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {clase.titulo}
          </h1>
          {curso && (
            <p className="text-lg text-gray-600">
              📚 Curso: {curso.titulo}
            </p>
          )}
          <p className="text-gray-500 mt-2">
            📅 {new Date(clase.fecha_clase).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {clase.duracion_minutos && (
              <span className="ml-4">
                ⏱️ {clase.duracion_minutos} minutos
              </span>
            )}
          </p>
          {clase.descripcion && (
            <p className="text-gray-700 mt-4 text-lg leading-relaxed">
              {clase.descripcion}
            </p>
          )}
        </div>

        {/* Reproductor de video */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <VideoPlayer
            videoUrl={clase.video_public_url}
            videoUrlParte2={clase.video_public_url_parte2}
            titulo={clase.titulo}
            transcripcionTexto={clase.transcripcion_texto}
            transcripcionSrt={clase.transcripcion_srt}
          />
        </div>

        {/* Información adicional */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📊 Información de la clase
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Detalles del video</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>📁 Tamaño: {formatFileSize(clase.video_tamano_bytes || 0)}</li>
                <li>🎬 Formato: {clase.video_tipo || 'mp4'}</li>
                <li>📊 Orden: #{clase.orden}</li>
                <li>✅ Estado: {clase.es_activo ? 'Activo' : 'Inactivo'}</li>
                {clase.es_multipart && (
                  <li>📦 Video multipart: {clase.total_partes} partes</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Transcripción</h3>
              {clase.tiene_transcripcion ? (
                <div className="text-sm text-green-600">
                  ✅ Disponible en el reproductor
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  ❌ No disponible
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              📅 Creado el {new Date(clase.created_at).toLocaleDateString('es-ES')} a las {new Date(clase.created_at).toLocaleTimeString('es-ES')}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center mt-8">
          <a
            href="/admin/clases"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ← Volver a clases
          </a>
          
          <div className="flex gap-3">
            <a
              href={`/admin/clases/${clase.id}/editar`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ✏️ Editar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}