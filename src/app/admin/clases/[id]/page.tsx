// Página para ver una clase grabada individual
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: {
    curso?: string;
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  let url1 = clase?.video_public_url || '';
  let url2 = clase?.video_public_url_parte2 || '';
  let url3 = clase?.video_public_url_parte3 || '';
  let url4 = clase?.video_public_url_parte4 || '';
  const videoPath = String(clase?.video_path || '');
  const videoPath2 = String(clase?.video_path_parte2 || '');
  const videoPath3 = String(clase?.video_path_parte3 || '');
  const videoPath4 = String(clase?.video_path_parte4 || '');
  if (!(await urlOk(url1)) && videoPath) {
    for (const b of bucketPriority) {
      const { data } = supabase.storage.from(b).getPublicUrl(videoPath);
      if (await urlOk(data.publicUrl)) {
        url1 = data.publicUrl;
        break;
      }
    }
  }
  if (!(await urlOk(url2)) && videoPath2) {
    for (const b of bucketPriority) {
      const { data } = supabase.storage.from(b).getPublicUrl(videoPath2);
      if (await urlOk(data.publicUrl)) {
        url2 = data.publicUrl;
        break;
      }
    }
  }
  if (!(await urlOk(url3)) && videoPath3) {
    for (const b of bucketPriority) {
      const { data } = supabase.storage.from(b).getPublicUrl(videoPath3);
      if (await urlOk(data.publicUrl)) {
        url3 = data.publicUrl;
        break;
      }
    }
  }
  if (!(await urlOk(url4)) && videoPath4) {
    for (const b of bucketPriority) {
      const { data } = supabase.storage.from(b).getPublicUrl(videoPath4);
      if (await urlOk(data.publicUrl)) {
        url4 = data.publicUrl;
        break;
      }
    }
  }
  return { url1, url2, url3, url4 };
}

export default async function VerClasePage({ params, searchParams }: PageProps) {
  const supabase = createSupabaseAdminClient();

  const cursoParam = String(searchParams?.curso || '').trim();

  // Si viene el curso en la URL, priorizar mostrar la última clase de ese curso
  if (cursoParam) {
    const { data: claseUltima } = await supabase
      .from('clases_grabadas')
      .select('*')
      .eq('curso_id', cursoParam)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (claseUltima) {
      const clase = claseUltima;
      const isUuid = (v: any) =>
        typeof v === 'string' &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
      let cursoTitulo = '';
      if (isUuid(clase.curso_id)) {
        const { data: curso } = await supabase
          .from('cursos')
          .select('titulo')
          .eq('id', clase.curso_id)
          .maybeSingle();
        cursoTitulo = curso?.titulo || '';
      }
      const urls = await resolvePublicUrls(supabase, clase);
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {clase.titulo}
              </h1>
              {cursoTitulo && (
                <p className="text-lg text-gray-600">
                  📚 Curso: {cursoTitulo}
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
          </div>
        </div>
      );
    }
  }

  // Si no hay curso en la URL, intentar por id
  const idNorm = String(params?.id || '').trim();
  const { data: clase, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('id', idNorm)
    .maybeSingle();

  if (!clase || (error && String(error.message || '').toLowerCase().includes('invalid input syntax'))) {
    const { data: claseGlobal } = await supabase
      .from('clases_grabadas')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (claseGlobal) {
      const cg = claseGlobal;
      const isUuid = (v: any) =>
        typeof v === 'string' &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
      let cursoTitulo = '';
      if (isUuid(cg.curso_id)) {
        const { data: curso } = await supabase
          .from('cursos')
          .select('titulo')
          .eq('id', cg.curso_id)
          .maybeSingle();
        cursoTitulo = curso?.titulo || '';
      }
      const urls = await resolvePublicUrls(supabase, cg);
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {cg.titulo}
              </h1>
              {cursoTitulo && (
                <p className="text-lg text-gray-600">
                  📚 Curso: {cursoTitulo}
                </p>
              )}
              <p className="text-gray-500 mt-2">
                📅 {new Date(cg.fecha_clase).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {cg.duracion_minutos && (
                  <span className="ml-4">
                    ⏱️ {cg.duracion_minutos} minutos
                  </span>
                )}
              </p>
              {cg.descripcion && (
                <p className="text-gray-700 mt-4 text-lg leading-relaxed">
                  {cg.descripcion}
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
              <VideoPlayer
                videoUrl={urls.url1 || cg.video_public_url}
                videoUrlParte2={urls.url2 || cg.video_public_url_parte2}
                videoUrlParte3={urls.url3 || cg.video_public_url_parte3}
                videoUrlParte4={urls.url4 || cg.video_public_url_parte4}
                titulo={cg.titulo}
                transcripcionTexto={cg.transcripcion_texto}
                transcripcionSrt={cg.transcripcion_srt}
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Clase no encontrada</h1>
          <div className="mt-6">
            <a href="/admin/clases" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">← Volver a clases</a>
          </div>
        </div>
      </div>
    );
  }

  let cursoTitulo = '';
  const isUuid = (v: any) =>
    typeof v === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
  if (isUuid(clase.curso_id)) {
    const { data: curso } = await supabase
      .from('cursos')
      .select('titulo')
      .eq('id', clase.curso_id)
      .maybeSingle();
    cursoTitulo = curso?.titulo || '';
  }
  const urlsMain = await resolvePublicUrls(supabase, clase);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {clase.titulo}
          </h1>
          {cursoTitulo && (
            <p className="text-lg text-gray-600">
              📚 Curso: {cursoTitulo}
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
            videoUrl={urlsMain.url1 || clase.video_public_url}
            videoUrlParte2={urlsMain.url2 || clase.video_public_url_parte2}
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
          <a href="/admin/clases" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">← Volver a clases</a>
          
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
