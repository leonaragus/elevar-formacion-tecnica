// Página para ver una clase grabada individual
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    curso?: string;
  }>;
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

export default async function VerClasePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { curso } = await searchParams;
  const supabase = createSupabaseAdminClient();

  const cursoParam = String(curso || '').trim();

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
        const { data: cursoData } = await supabase
          .from('cursos')
          .select('titulo')
          .eq('id', clase.curso_id)
          .single();
        cursoTitulo = cursoData?.titulo || '';
      }

      const urls = await resolvePublicUrls(supabase, clase);

      return (
        <div className="container mx-auto p-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{clase.titulo}</h1>
            {cursoTitulo && <p className="text-gray-600">Curso: {cursoTitulo}</p>}
          </div>
          <div className="mb-4">
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
      );
    }
  }

  const { data: clase, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !clase) {
    notFound();
  }

  const urls = await resolvePublicUrls(supabase, clase);

  const isUuid = (v: any) =>
    typeof v === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

  let cursoTitulo = '';
  if (isUuid(clase.curso_id)) {
    const { data: cursoData } = await supabase
      .from('cursos')
      .select('titulo')
      .eq('id', clase.curso_id)
      .single();
    cursoTitulo = cursoData?.titulo || '';
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{clase.titulo}</h1>
        {cursoTitulo && <p className="text-gray-600">Curso: {cursoTitulo}</p>}
      </div>
      <div className="mb-4">
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
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Detalles Técnicos (Admin)</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(
            {
              id: clase.id,
              video_path: clase.video_path,
              video_path_parte2: clase.video_path_parte2,
              video_path_parte3: clase.video_path_parte3,
              video_path_parte4: clase.video_path_parte4,
              es_multipart: clase.es_multipart,
              total_partes: clase.total_partes,
              video_tamano_bytes: clase.video_tamano_bytes,
              bucket: 'auto-detected',
              urls_resolved: urls
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
