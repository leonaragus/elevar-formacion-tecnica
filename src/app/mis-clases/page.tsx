// Página para que los alumnos vean sus clases grabadas
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: {
    curso_id?: string;
  };
}

export default async function MisClasesPage({ searchParams }: PageProps) {
  const supabase = createSupabaseServerClient();

  // Obtener usuario actual
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    notFound();
  }
  
  const user = data.user;

  const cursoId = searchParams?.curso_id;

  // Si no hay curso seleccionado, mostrar cursos disponibles
  if (!cursoId) {
    // Obtener cursos en los que está inscrito el alumno
    const { data: cursosInscritos } = await supabase
      .from('cursos_alumnos')
      .select(`
        curso_id,
        cursos!inner(titulo, id)
      `)
      .eq('user_id', user.id)
      .eq('estado', 'activo');

    if (!cursosInscritos || cursosInscritos.length === 0) {
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
  const { data: clases } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .eq('es_activo', true)
    .order('fecha_clase', { ascending: false });

  // Obtener información del curso
  const { data: curso } = await supabase
    .from('cursos')
    .select('titulo')
    .eq('id', cursoId)
    .single();

  // Verificar que el alumno esté inscrito en este curso
  const { data: inscripcion } = await supabase
    .from('cursos_alumnos')
    .select('estado')
    .eq('user_id', user.id)
    .eq('curso_id', cursoId)
    .eq('estado', 'activo')
    .single();

  if (!inscripcion) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              📹 Clases Grabadas
            </h1>
            <Link
              href="/mis-clases"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Cambiar curso
            </Link>
          </div>
          
          {curso && (
            <p className="text-xl text-gray-600">
              📚 {curso.titulo}
            </p>
          )}
        </div>

        {/* Lista de clases */}
        {clases && clases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clases.map((clase) => (
              <div key={clase.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📹</div>
                    <p className="text-sm text-gray-500">Clase grabada</p>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {clase.titulo}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p className="flex items-center">
                      <span className="mr-2">📅</span>
                      {new Date(clase.fecha_clase).toLocaleDateString('es-ES')}
                    </p>
                    
                    {clase.duracion_minutos && (
                      <p className="flex items-center">
                        <span className="mr-2">⏱️</span>
                        {clase.duracion_minutos} minutos
                      </p>
                    )}
                    
                    {clase.tiene_transcripcion && (
                      <p className="flex items-center text-green-600">
                        <span className="mr-2">📝</span>
                        Con transcripción
                      </p>
                    )}
                  </div>
                  
                  <Link
                    href={`/clases/${clase.id}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ▶️ Ver clase
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📹</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay clases grabadas disponibles
            </h3>
            <p className="text-gray-600 mb-6">
              Aún no hay clases grabadas para este curso.
            </p>
            <Link
              href="/mis-clases"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ver otros cursos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}