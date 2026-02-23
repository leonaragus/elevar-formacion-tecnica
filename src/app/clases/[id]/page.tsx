// Página para que los alumnos vean una clase grabada
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import CommentsSection from '@/components/CommentsSection';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function resolvePublicUrls(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  clase: any
) {
  const bucketPriority = ['videos', 'materiales', 'clases-grabadas'];
  
  async function urlOk(url: string | undefined) {
    if (!url) return false;
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function getWorkingUrl(path: string) {
    if (!path) return null;
    for (const b of bucketPriority) {
      // 1. Try public URL
      const { data: publicData } = supabase.storage.from(b).getPublicUrl(path);
      if (await urlOk(publicData.publicUrl)) return publicData.publicUrl;
      
      // 2. Try signed URL (valid for 24h) if public failed (e.g. private bucket)
      try {
        const { data: signedData } = await supabase.storage.from(b).createSignedUrl(path, 60 * 60 * 24);
        if (signedData?.signedUrl && await urlOk(signedData.signedUrl)) return signedData.signedUrl;
      } catch {}
    }
    return null;
  }

  let url1 = clase?.video_public_url || '';
  let url2 = clase?.video_public_url_parte2 || '';
  let url3 = clase?.video_public_url_parte3 || '';
  let url4 = clase?.video_public_url_parte4 || '';
  
  const videoPath = String(clase?.video_path || '');
  const videoPath2 = String(clase?.video_path_parte2 || '');
  const videoPath3 = String(clase?.video_path_parte3 || '');
  const videoPath4 = String(clase?.video_path_parte4 || '');

  // Resolve URLs if current ones are not working
  if (!(await urlOk(url1)) && videoPath) {
    const resolved = await getWorkingUrl(videoPath);
    if (resolved) url1 = resolved;
  }
  if (!(await urlOk(url2)) && videoPath2) {
    const resolved = await getWorkingUrl(videoPath2);
    if (resolved) url2 = resolved;
  }
  if (!(await urlOk(url3)) && videoPath3) {
    const resolved = await getWorkingUrl(videoPath3);
    if (resolved) url3 = resolved;
  }
  if (!(await urlOk(url4)) && videoPath4) {
    const resolved = await getWorkingUrl(videoPath4);
    if (resolved) url4 = resolved;
  }

  return { url1, url2, url3, url4 };
}

export default async function VerClaseAlumnoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  // Obtener la clase grabada
  const { data: clase, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('id', id)
    .eq('activo', true)
    .eq('es_activo', true)
    .single();

  if (error || !clase) {
    notFound();
  }

  const urls = await resolvePublicUrls(adminSupabase, clase);

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
            videoUrl={urls.url1 || clase.video_public_url}
            videoUrlParte2={urls.url2 || clase.video_public_url_parte2}
            videoUrlParte3={urls.url3 || clase.video_public_url_parte3}
            videoUrlParte4={urls.url4 || clase.video_public_url_parte4}
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
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Transcripción</h3>
              {(clase.tiene_transcripcion || (clase.transcripcion_texto && clase.transcripcion_texto.length > 0) || (clase.transcripcion_srt && clase.transcripcion_srt.length > 0)) ? (
                <div className="text-sm text-green-600">
                  ✅ Disponible en el reproductor
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  ❌ No disponible
                  {/* Debug info: tiene={String(clase.tiene_transcripcion)}, txtLen={clase.transcripcion_texto?.length}, srtLen={clase.transcripcion_srt?.length} */}
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
