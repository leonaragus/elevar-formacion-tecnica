import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import MisClasesClientContent from './MisClasesClientContent'; // Importar el nuevo componente de cliente

export const dynamic = 'force-dynamic';

async function resolvePublicUrls(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
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
  const videoPath = String(clase?.video_path || '');
  const videoPath2 = String(clase?.video_path_parte2 || '');
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
  return { url1, url2 };
}

interface PageProps {
  searchParams?: Promise<{
    curso_id?: string;
    clase_id?: string;
  }>;
}

export default async function MisClasesServerContent(props: PageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  
  const studentEmail = (await cookies()).get("student_email")?.value;
  const studentOk = (await cookies()).get("student_ok")?.value === "1";
  const studentCourseId = (await cookies()).get("student_course_id")?.value;

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

  const urls = claseSeleccionada ? await resolvePublicUrls(adminSupabase, claseSeleccionada) : { url1: '', url2: '' };

  return (
    <MisClasesClientContent 
      clases={clases || []}
      claseSeleccionada={claseSeleccionada}
      curso={curso}
      urls={urls}
      cursoId={cursoId}
      searchParams={searchParams}
    />
  );
}
