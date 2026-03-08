// Página para que los alumnos vean sus clases grabadas
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FloatingFeedbackButton from '@/components/FloatingFeedbackButton';
import CommentsCourseSummary from '@/components/CommentsCourseSummary';
import { cookies } from 'next/headers';
import VideoPlayer from '@/components/VideoPlayer';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{
    curso_id?: string;
    clase_id?: string;
  }>;
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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

    const privateBuckets = ['videos', 'clases-grabadas'];
    for (const b of privateBuckets) {
       try {
        const { data: signedData } = await supabase.storage.from(b).createSignedUrl(path, 60 * 60 * 24);
        if (signedData?.signedUrl) {
            if (await urlOk(signedData.signedUrl)) return signedData.signedUrl;
        }
      } catch {}
    }

    for (const b of bucketPriority) {
      const { data: publicData } = supabase.storage.from(b).getPublicUrl(path);
      if (await urlOk(publicData.publicUrl)) return publicData.publicUrl;
      
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

export default async function MisClasesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  
  const studentEmail = cookieStore.get("student_email")?.value;
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;

  if (!user && !studentOk) {
    notFound();
  }
  
  const cursoId = searchParams?.curso_id || (studentOk ? studentCourseId : undefined);

  if (!cursoId) {
    let cursosInscritos: any[] = [];
    const adminSupabase = createSupabaseServiceRoleClient();

    if (user) {
      const { data } = await adminSupabase
        .from('cursos_alumnos')
        .select(`
          curso_id,
          cursos!inner(titulo, id)
        `)
        .eq('user_id', user.id)
        .eq('estado', 'activo');
      cursosInscritos = data || [];
    } else if (studentOk && studentCourseId) {
       const { data: curso } = await adminSupabase
         .from('cursos')
         .select('titulo, id')
         .eq('id', studentCourseId)
         .single();
       if (curso) {
         cursosInscritos = [{ curso_id: curso.id, cursos: curso }];
       }
    }

    if (cursosInscritos.length === 0) {
      return (
        <div className="min-h-screen bg-gray-950 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-gray-800 rounded-lg shadow-md p-8">
              <div className="text-6xl mb-4">📹</div>
              <h1 className="text-2xl font-bold text-white mb-4">
                Mis Clases Grabadas
              </h1>
              <p className="text-gray-400 mb-6">
                No estás inscrito en ningún curso con clases grabadas disponibles.
              </p>
              <Link
                href="/cursos"
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ver cursos disponibles
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-950 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              📹 Mis Clases Grabadas
            </h1>
            <p className="text-gray-400">
              Selecciona un curso para ver sus clases grabadas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursosInscritos.map((inscripcion) => (
              <div key={inscripcion.curso_id} className="bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg hover:bg-gray-700 transition-shadow">
                <div className="text-4xl mb-4 text-center">📚</div>
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  {inscripcion.cursos.titulo}
                </h3>
                <Link
                  href={`/mis-clases?curso_id=${inscripcion.curso_id}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ver clases grabadas
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const adminSupabase = createSupabaseServiceRoleClient();
  
  let isEnrolled = false;
  
  if (user) {
    const { data: insc } = await adminSupabase
      .from('cursos_alumnos')
      .select('id')
      .eq('user_id', user.id)
      .eq('curso_id', String(cursoId))
      .eq('estado', 'activo')
      .maybeSingle();
    if (insc) {
      isEnrolled = true;
    }
  } else if (studentOk && String(studentCourseId) === String(cursoId)) {
    isEnrolled = true;
  }

  if (!isEnrolled) {
    notFound();
  }

  const { data: clases } = await adminSupabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('fecha_clase', { ascending: false });

  const claseIdParam = searchParams?.clase_id;
  const claseSeleccionada = clases?.find(c => String(c.id) === String(claseIdParam)) || (clases && clases.length > 0 ? clases[0] : null);

  let urls = { url1: '', url2: '', url3: '', url4: '' };
  if (claseSeleccionada) {
     // @ts-ignore
     urls = await resolvePublicUrls(adminSupabase, claseSeleccionada);
  }

  const { data: curso } = await adminSupabase
    .from('cursos')
    .select('titulo')
    .eq('id', cursoId)
    .single();

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <span className="text-4xl">📹</span> Clases Grabadas
            </h1>
            {curso && (
              <p className="text-xl text-gray-400 mt-1">
                📚 {curso.titulo}
              </p>
            )}
          </div>
          <Link
            href="/mis-clases"
            className="inline-flex items-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            ← Cambiar curso
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {claseSeleccionada ? (
              <>
                <div className="bg-black rounded-xl shadow-2xl overflow-hidden aspect-video">
                  <VideoPlayer
                    videoUrl={urls.url1 || claseSeleccionada.video_public_url}
                    videoUrlParte2={urls.url2 || claseSeleccionada.video_public_url_parte2}
                    videoUrlParte3={urls.url3 || claseSeleccionada.video_public_url_parte3}
                    videoUrlParte4={urls.url4 || claseSeleccionada.video_public_url_parte4}
                    titulo={claseSeleccionada.titulo}
                    transcripcionTexto={claseSeleccionada.transcripcion_texto}
                    transcripcionSrt={claseSeleccionada.transcripcion_srt}
                  />
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {claseSeleccionada.titulo}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      📅 {new Date(claseSeleccionada.fecha_clase).toLocaleDateString('es-ES', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </span>
                    {claseSeleccionada.duracion_minutos && (
                      <span className="flex items-center gap-1">
                        ⏱️ {claseSeleccionada.duracion_minutos} min
                      </span>
                    )}
                    {claseSeleccionada.tiene_transcripcion && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        📝 Transcripción disponible
                      </span>
                    )}
                  </div>
                  {claseSeleccionada.descripcion && (
                    <div className="prose prose-invert max-w-none text-gray-300">
                      {claseSeleccionada.descripcion}
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 hidden md:block">
                  <CommentsCourseSummary cursoId={String(cursoId)} claseId={String(claseSeleccionada.id)} />
                </div>
                
                <FloatingFeedbackButton cursoId={String(cursoId)} claseId={String(claseSeleccionada.id)} />
              </>
            ) : (
              <div className="bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-xl font-semibold text-white">No hay clases disponibles</h3>
                <p className="text-gray-400 mt-2">Aún no se han subido videos para este curso.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden sticky top-8">
              <div className="p-4 border-b border-gray-700 bg-gray-800">
                <h3 className="font-bold text-white flex items-center gap-2">
                  📋 Lista de Clases
                </h3>
              </div>
              <div className="divide-y divide-gray-700 max-h-[calc(100vh-200px)] overflow-y-auto">
                {clases && clases.length > 0 ? (
                  clases.map((clase) => {
                    const isSelected = String(clase.id) === String(claseSeleccionada?.id);
                    return (
                      <Link
                        key={clase.id}
                        href={`/mis-clases?curso_id=${cursoId}&clase_id=${clase.id}`}
                        className={`block p-4 hover:bg-gray-700/60 transition-colors ${
                          isSelected ? 'bg-blue-900/50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                          }`}>
                            <span className="text-lg">▶️</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className={`text-sm font-bold truncate ${
                              isSelected ? 'text-white' : 'text-gray-200'
                            }`}>
                              {clase.titulo}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">
                              📅 {new Date(clase.fecha_clase).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No hay otras clases
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
