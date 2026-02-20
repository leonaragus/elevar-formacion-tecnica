// Página para que los alumnos vean una clase grabada
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import TranscriptionPanel from '@/components/TranscriptionPanel';
import CommentsSection from '@/components/CommentsSection';
import { cookies } from 'next/headers';
import { useState, useRef } from 'react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function VerClaseAlumnoPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient();

  // Obtener la clase grabada
  const { data: clase, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('id', params.id)
    .eq('activo', true)
    .eq('es_activo', true)
    .single();

  if (error || !clase) {
    notFound();
  }

  const cookieStore = cookies();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;

  let isEnrolled = false;
  const adminSupabase = createSupabaseServiceRoleClient();

  if (user) {
    const { data: insc } = await adminSupabase
      .from('cursos_alumnos')
      .select('id')
      .eq('user_id', user.id)
      .eq('curso_id', clase.curso_id)
      .eq('estado', 'activo')
      .maybeSingle();
    if (insc) {
      isEnrolled = true;
    } else {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      if (profile && profile.id !== user.id) {
        const { data: inscAlt } = await adminSupabase
          .from('cursos_alumnos')
          .select('id')
          .eq('user_id', profile.id)
          .eq('curso_id', clase.curso_id)
          .eq('estado', 'activo')
          .maybeSingle();
        if (inscAlt) isEnrolled = true;
      }
    }
  } else if (studentOk && String(studentCourseId) === String(clase.curso_id)) {
    isEnrolled = true;
  }

  if (!isEnrolled) {
    notFound();
  }

  // Obtener información del curso
  const { data: curso } = await supabase
    .from('cursos')
    .select('titulo')
    .eq('id', clase.curso_id)
    .single();

  // Client-side state for video playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

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

        {/* Contenido principal: Video y Transcripción */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Reproductor de video */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
            <VideoPlayer
              videoRef={videoRef}
              videoUrl={clase.video_public_url}
              videoUrlParte2={clase.video_public_url_parte2}
              titulo={clase.titulo}
              onTimeUpdate={setCurrentTime}
            />
          </div>

          {/* Panel de Transcripción */}
          <div className="lg:col-span-1">
            <TranscriptionPanel
              transcripcionTexto={clase.transcripcion_texto}
              transcripcionSrt={clase.transcripcion_srt}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
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
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Transcripción</h3>
              {clase.tiene_transcripcion ? (
                <div className="text-sm text-green-600">
                  ✅ Disponible en el panel lateral
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  ❌ No disponible
                </div>
              )}
            </div>
          </div>
        </div>

        <CommentsSection claseId={String(clase.id)} />

        {/* Botón de regreso */}
        <div className="mt-8">
          <a
            href="/mis-clases"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ← Volver a mis cursos
          </a>
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
