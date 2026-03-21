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
  const bucketPriority = ['materiales', 'videos', 'clases-grabadas'];
  
  async function getWorkingUrl(path: string) {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    // Intentar deducir el bucket del path
    let resolvedBucket = bucketPriority[0];
    let cleanPath = path;

    for (const b of bucketPriority) {
        if (path.startsWith(`${b}/`)) {
            resolvedBucket = b;
            cleanPath = path.substring(b.length + 1);
            break;
        }
    }

    const { data } = supabase.storage.from(resolvedBucket).getPublicUrl(cleanPath);
    return data?.publicUrl || null;
  }

  // Si ya tenemos una URL pública en la base de datos, la usamos directamente
  // Pero si el path existe, generamos la URL fresca para asegurar que el bucket sea el correcto
  let url1 = clase?.video_path ? await getWorkingUrl(clase.video_path) : (clase?.video_public_url || '');
  let url2 = clase?.video_path_parte2 ? await getWorkingUrl(clase.video_path_parte2) : (clase?.video_public_url_parte2 || '');
  let url3 = clase?.video_path_parte3 ? await getWorkingUrl(clase.video_path_parte3) : (clase?.video_public_url_parte3 || '');
  let url4 = clase?.video_path_parte4 ? await getWorkingUrl(clase.video_path_parte4) : (clase?.video_public_url_parte4 || '');

  return { url1, url2, url3, url4 };
}

export default async function MisClasesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();

  // Obtener usuario actual o sesión de alumno por cookie
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  
  const studentEmail = cookieStore.get("student_email")?.value;
  const studentOk = cookieStore.get("student_ok")?.value === "1";
  const studentCourseId = cookieStore.get("student_course_id")?.value;
  const isAdmin = cookieStore.get("prof_code_ok")?.value === "1" || user?.user_metadata?.role === 'admin';

  // Si hay searchParams.curso_id, lo usamos. Si no, y es alumno por cookie, usamos studentCourseId.
  const cursoIdRaw = searchParams?.curso_id || (studentOk ? studentCourseId : undefined);
  const cursoId = typeof cursoIdRaw === 'string' ? cursoIdRaw.trim() : undefined;

  console.log('DEBUG MisClasesPage:', { 
    userId: user?.id, 
    studentEmail, 
    studentOk, 
    studentCourseId,
    isAdmin,
    cursoId
  });

  if (!user && !studentOk && !isAdmin) {
    console.log('DEBUG: Ni usuario Auth ni cookie studentOk ni admin. Redirigiendo a /auth.');
    const nextUrl = `/mis-clases${cursoId ? `?curso_id=${cursoId}` : ''}`;
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-4">Inicia Sesión</h1>
          <p className="text-gray-400 mb-6">Debes estar identificado para acceder a tus clases.</p>
          <Link
            href={`/auth?next=${encodeURIComponent(nextUrl)}`}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full justify-center"
          >
            Ir al Login
          </Link>
        </div>
      </div>
    );
  }
  
  console.log('DEBUG: cursoId resuelto:', cursoId);

  // Si no hay curso seleccionado, mostrar cursos disponibles o estado de cuenta
  if (!cursoId) {
    // ... (resto del código del listado de cursos)
    let cursosInscritos: any[] = [];
    let cursosPendientes: any[] = [];
    const adminSupabase = createSupabaseServiceRoleClient();

    if (isAdmin) {
        // Si es admin, puede ver todos los cursos que tengan clases
        const { data: allCursos } = await adminSupabase.from('cursos').select('id, titulo');
        cursosInscritos = (allCursos || []).map(c => ({ curso_id: c.id, estado: 'activo', cursos: c }));
    } else if (user) {
      const { data } = await adminSupabase
        .from('cursos_alumnos')
        .select(`
          curso_id,
          estado,
          cursos!inner(titulo, id)
        `)
        .eq('user_id', user.id);
      
      const base = data || [];
      cursosInscritos = base.filter(i => i.estado === 'activo');
      cursosPendientes = base.filter(i => i.estado === 'pendiente');

      // Also check 'intereses' table for pending registrations by email
      const { data: intereses } = await adminSupabase
        .from('intereses')
        .select('course_id, cursos!inner(titulo, id)')
        .eq('email', user.email);
      
      if (intereses && intereses.length > 0) {
        const pendingFromIntereses = intereses
          .filter(i => !cursosPendientes.find(cp => cp.curso_id === i.course_id) && !cursosInscritos.find(ca => ca.curso_id === i.course_id))
          .map(i => {
            const c = i.cursos;
            const cursoObj = Array.isArray(c) ? c[0] : c;
            return { curso_id: i.course_id, estado: 'pendiente', cursos: cursoObj };
          });
        cursosPendientes = [...cursosPendientes, ...pendingFromIntereses];
      }
    } else if (studentOk && studentCourseId) {
       // Caso legacy (alumno por cookie)
       const { data: cursoLegacy } = await adminSupabase
         .from('cursos')
         .select('id, titulo')
         .eq('id', studentCourseId)
         .maybeSingle();
       
       if (cursoLegacy) {
         cursosInscritos = [{ curso_id: studentCourseId, estado: 'activo', cursos: cursoLegacy }];
       }
    }

    if (cursosInscritos.length === 0) {
      const hasPending = cursosPendientes.length > 0;
      return (
        <div className="min-h-screen bg-gray-950 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-gray-800 rounded-lg shadow-md p-8">
              <div className="text-6xl mb-4">{hasPending ? "⏳" : "📹"}</div>
              <h1 className="text-2xl font-bold text-white mb-4">
                {hasPending ? "Inscripción en Revisión" : "Mis Clases Grabadas"}
              </h1>
              <p className="text-gray-400 mb-6">
                {hasPending 
                  ? "Tu solicitud de inscripción está siendo revisada por el administrador. Una vez aprobada, podrás acceder a las clases aquí."
                  : "No estás inscrito en ningún curso con clases grabadas disponibles."}
              </p>
              <Link
                href="/cursos"
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {hasPending ? "Ver estado de mis cursos" : "Ver cursos disponibles"}
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

  // Si hay curso seleccionado, mostrar clases grabadas
  // Usamos el cliente de service role para saltar RLS ya que hemos validado la inscripción manualmente
  const adminSupabase = createSupabaseServiceRoleClient();
  
  // 1. Verificar que el alumno esté inscrito en este curso
  let isEnrolled = isAdmin; // Los admins están siempre "inscritos"
  let isPending = false;
  console.log('DEBUG: Iniciando verificación de inscripción para curso:', cursoId);
  
  if (!isAdmin && user) {
    console.log('DEBUG: Verificando para usuario autenticado:', user.id);
    const { data: insc, error: inscError } = await adminSupabase
      .from('cursos_alumnos')
      .select('id, estado, user_id, curso_id')
      .eq('user_id', user.id)
      .eq('curso_id', cursoId)
      .maybeSingle();
    
    if (insc) {
      console.log('DEBUG: Inscripción encontrada:', insc);
      if (insc.estado === 'activo') {
        isEnrolled = true;
      } else if (insc.estado === 'pendiente') {
        isPending = true;
      }
    } else {
      console.log('DEBUG: No se encontró inscripción directa por user_id. Probando por email:', user.email);
      // Fallback: buscar por email si el user_id no coincide
      const { data: profileInsc } = await adminSupabase
        .from('cursos_alumnos')
        .select('id, estado, user_id')
        .eq('curso_id', cursoId)
        .limit(100); 

      if (profileInsc && profileInsc.length > 0) {
          // Buscamos el ID de este email
          const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
          const usersWithThisEmail = authUsers?.filter(u => u.email?.toLowerCase() === user.email?.toLowerCase());
          const matched = profileInsc.find(i => usersWithThisEmail?.some(u => u.id === i.user_id));
          
          if (matched) {
              console.log('DEBUG: Inscripción encontrada vinculada por email:', matched);
              if (matched.estado === 'activo') isEnrolled = true;
              else if (matched.estado === 'pendiente') isPending = true;
          }
      }
      
      // Check intereses too as fallback for pending
      if (!isEnrolled && !isPending) {
          const { data: int } = await adminSupabase
            .from('intereses')
            .select('id')
            .eq('email', user.email)
            .eq('course_id', cursoId)
            .maybeSingle();
          if (int) isPending = true;
      }
    }
  } else if (!isAdmin && studentOk && String(studentCourseId) === String(cursoId)) {
    console.log('DEBUG: Verificando para alumno por cookies legacy');
    isEnrolled = true;
  }

  console.log('DEBUG: Inscripción verificada:', { isEnrolled, isPending, cursoId });

  if (!isEnrolled) {
    console.log('DEBUG: Usuario no inscrito en este curso o inscripción no activa. isPending:', isPending);
    // En lugar de notFound(), si es pendiente mostramos el mensaje de espera
    return (
        <div className="min-h-screen bg-gray-950 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-gray-800 rounded-lg shadow-md p-8">
              <div className="text-6xl mb-4">{isPending ? "⏳" : "🚫"}</div>
              <h1 className="text-2xl font-bold text-white mb-4">
                {isPending ? "Inscripción en Revisión" : "Acceso Denegado"}
              </h1>
              <p className="text-gray-400 mb-6">
                {isPending 
                  ? "Tu solicitud de inscripción está siendo revisada por el administrador. Una vez aprobada, podrás acceder a las clases aquí."
                  : "No tienes permiso para acceder a este curso o tu inscripción no ha sido procesada."}
              </p>
              <Link
                href="/mis-clases"
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver a mis cursos
              </Link>
            </div>
          </div>
        </div>
      );
  }

  // 2. Obtener clases grabadas
  console.log('DEBUG: Buscando clases para curso:', cursoId);
  const { data: clases, error: clasesError } = await adminSupabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('fecha_clase', { ascending: false });

  console.log('DEBUG: Clases encontradas:', clases?.length || 0, 'Error:', clasesError);
  
  if (!clases || clases.length === 0) {
      console.log('DEBUG: No active classes found. Checking if there are inactive ones...');
      const { data: inactive } = await adminSupabase
        .from('clases_grabadas')
        .select('id, titulo, activo')
        .eq('curso_id', cursoId)
        .limit(5);
      console.log('DEBUG: Inactive classes found (might explain why user sees nothing):', inactive);
  }

  if (clases && clases.length > 0) {
    console.log('DEBUG: Primera clase:', { id: clases[0].id, titulo: clases[0].titulo });
  }

  // 3. Obtener clase seleccionada (si hay una en searchParams, o la primera)
  const claseIdParam = searchParams?.clase_id;
  const claseSeleccionada = clases?.find(c => String(c.id) === String(claseIdParam)) || (clases && clases.length > 0 ? clases[0] : null);

  let urls = { url1: '', url2: '', url3: '', url4: '' };
  if (claseSeleccionada) {
     // @ts-ignore
     urls = await resolvePublicUrls(adminSupabase, claseSeleccionada);
  }

  // 4. Obtener información del curso
  const { data: curso } = await adminSupabase
    .from('cursos')
    .select('titulo')
    .eq('id', cursoId)
    .single();

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Encabezado */}
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
          {/* Panel Principal: Video y Detalles */}
          <div className="lg:col-span-2 space-y-6">
            {claseSeleccionada ? (
              <>
                {/* Reproductor de Video */}
                <div className="bg-transparent rounded-xl shadow-2xl">
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

                {/* Info de la Clase */}
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

                {/* Sección de Comentarios (Legacy - se mantiene por compatibilidad visual, pero el botón flotante es el principal) */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 hidden md:block">
                  <CommentsCourseSummary cursoId={String(cursoId)} claseId={String(claseSeleccionada?.id || '')} />
                </div>
                
                {/* Botón Flotante de Feedback */}
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

          {/* Sidebar: Lista de Clases */}
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
