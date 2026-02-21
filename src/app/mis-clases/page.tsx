// Página para que los alumnos vean sus clases grabadas
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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

  console.log('DEBUG MisClasesPage:', { 
    userId: user?.id, 
    studentEmail, 
    studentOk, 
    studentCourseId,
    searchParamsCursoId: searchParams?.curso_id
  });

  if (!user && !studentOk) {
    console.log('DEBUG: Ni usuario Auth ni cookie studentOk. Redirigiendo a notFound.');
    notFound();
  }
  
  // Si hay searchParams.curso_id, lo usamos. Si no, y es alumno por cookie, usamos studentCourseId.
  const cursoId = searchParams?.curso_id || (studentOk ? studentCourseId : undefined);

  console.log('DEBUG: cursoId resuelto:', cursoId);

  // Si no hay curso seleccionado, mostrar cursos disponibles
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
       // Si es alumno por cookie, ya tenemos su curso
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
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-6xl mb-4">📹</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Mis Clases Grabadas
              </h1>
              <p className="text-gray-600 mb-6">
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📹 Mis Clases Grabadas
            </h1>
            <p className="text-gray-600">
              Selecciona un curso para ver sus clases grabadas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursosInscritos.map((inscripcion) => (
              <div key={inscripcion.curso_id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4 text-center">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
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
  let isEnrolled = false;
  console.log('DEBUG: Iniciando verificación de inscripción para curso:', cursoId);
  
  if (user) {
    console.log('DEBUG: Verificando para usuario autenticado:', user.id);
    const { data: insc, error: inscError } = await adminSupabase
      .from('cursos_alumnos')
      .select('id, estado, user_id, curso_id')
      .eq('user_id', user.id)
      .eq('curso_id', String(cursoId))
      .eq('estado', 'activo')
      .maybeSingle();
    
    if (insc) {
      console.log('DEBUG: Inscripción encontrada:', insc);
      isEnrolled = true;
    } else {
      console.log('DEBUG: No se encontró inscripción activa. Error:', inscError);
      // Fallback: buscar por email si el user_id no coincide (por si hay perfiles duplicados o discrepancias)
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      
      if (profile && profile.id !== user.id) {
        console.log('DEBUG: Probando con profile.id alternativo:', profile.id);
        const { data: inscAlt } = await adminSupabase
          .from('cursos_alumnos')
          .select('id')
          .eq('user_id', profile.id)
          .eq('curso_id', String(cursoId))
          .eq('estado', 'activo')
          .maybeSingle();
        if (inscAlt) isEnrolled = true;
      }
    }
  } else if (studentOk && String(studentCourseId) === String(cursoId)) {
    console.log('DEBUG: Verificando para alumno por cookies legacy');
    isEnrolled = true;
  }

  console.log('DEBUG: Inscripción verificada:', { isEnrolled, cursoId });

  if (!isEnrolled) {
    console.log('DEBUG: Usuario no inscrito en este curso o inscripción no activa.');
    notFound();
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
  if (clases && clases.length > 0) {
    console.log('DEBUG: Primera clase:', { id: clases[0].id, titulo: clases[0].titulo });
  }

  // 3. Obtener clase seleccionada (si hay una en searchParams, o la primera)
  const claseIdParam = searchParams?.clase_id;
  const claseSeleccionada = clases?.find(c => String(c.id) === String(claseIdParam)) || (clases && clases.length > 0 ? clases[0] : null);

  // 4. Obtener información del curso
  const { data: curso } = await adminSupabase
    .from('cursos')
    .select('titulo')
    .eq('id', cursoId)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-4xl">📹</span> Clases Grabadas
            </h1>
            {curso && (
              <p className="text-xl text-gray-600 mt-1">
                📚 {curso.titulo}
              </p>
            )}
          </div>
          <Link
            href="/mis-clases"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
                <div className="bg-black rounded-xl shadow-2xl overflow-hidden aspect-video">
                  <VideoPlayer
                    videoUrl={claseSeleccionada.video_public_url}
                    videoUrlParte2={claseSeleccionada.video_public_url_parte2}
                    videoUrlParte3={claseSeleccionada.video_public_url_parte3}
                    videoUrlParte4={claseSeleccionada.video_public_url_parte4}
                    titulo={claseSeleccionada.titulo}
                    transcripcionTexto={claseSeleccionada.transcripcion_texto}
                    transcripcionSrt={claseSeleccionada.transcripcion_srt}
                  />
                </div>

                {/* Info de la Clase */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {claseSeleccionada.titulo}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
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
                    <div className="prose prose-blue max-w-none text-gray-700">
                      {claseSeleccionada.descripcion}
                    </div>
                  )}
                </div>

                {/* Sección de Comentarios */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <CommentsCourseSummary cursoId={String(cursoId)} />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-xl font-semibold text-gray-900">No hay clases disponibles</h3>
                <p className="text-gray-500 mt-2">Aún no se han subido videos para este curso.</p>
              </div>
            )}
          </div>

          {/* Sidebar: Lista de Clases */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-8">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  📋 Lista de Clases
                </h3>
              </div>
              <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
                {clases && clases.length > 0 ? (
                  clases.map((clase) => {
                    const isSelected = String(clase.id) === String(claseSeleccionada?.id);
                    return (
                      <Link
                        key={clase.id}
                        href={`/mis-clases?curso_id=${cursoId}&clase_id=${clase.id}`}
                        className={`block p-4 hover:bg-blue-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className="text-lg">▶️</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className={`text-sm font-bold truncate ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {clase.titulo}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              📅 {new Date(clase.fecha_clase).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
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
