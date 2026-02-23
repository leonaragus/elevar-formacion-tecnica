import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function TestDBPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  // Usar variables de entorno directamente para asegurar que usamos las mismas que la app
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Obtener usuario
  const { data: { user } } = await supabase.auth.getUser(); // Esto no funcionará con service role para obtener el usuario de la request, necesitamos el token
  
  // Intentar obtener usuario del cliente de servidor normal
  const { createSupabaseServerClient } = require('@/lib/supabase/server');
  const serverSupabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await serverSupabase.auth.getUser();

  // 2. Obtener Cursos
  const { data: cursos, error: cursosError } = await supabase
    .from('cursos')
    .select('*');

  // 3. Obtener Clases
  const { data: clases, error: clasesError } = await supabase
    .from('clases_grabadas')
    .select('*');

  // 4. Obtener Inscripciones (si hay usuario)
  let inscripciones = [];
  if (authUser) {
    const { data: insc } = await supabase
      .from('cursos_alumnos')
      .select('*')
      .eq('user_id', authUser.id);
    inscripciones = insc || [];
  }

  return (
    <div className="p-8 font-mono text-sm">
      <h1 className="text-2xl font-bold mb-4">Diagnóstico de DB y Sesión</h1>
      
      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h2 className="font-bold text-lg mb-2">1. Sesión y Cookies</h2>
        <p><strong>Usuario Auth:</strong> {authUser ? `${authUser.email} (${authUser.id})` : 'No autenticado'}</p>
        <div className="mt-2">
          <strong>Cookies:</strong>
          <ul className="list-disc pl-5 mt-1">
            {allCookies.map(c => (
              <li key={c.name}>{c.name}: {c.value.substring(0, 20)}...</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h2 className="font-bold text-lg mb-2">2. Cursos ({cursos?.length || 0})</h2>
        {cursosError && <p className="text-red-600">Error: {cursosError.message}</p>}
        <ul className="list-disc pl-5">
          {cursos?.map(c => (
            <li key={c.id}>ID: <strong>{c.id}</strong> | Título: {c.titulo}</li>
          ))}
        </ul>
      </div>

      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h2 className="font-bold text-lg mb-2">3. Clases Grabadas ({clases?.length || 0})</h2>
        {clasesError && <p className="text-red-600">Error: {clasesError.message}</p>}
        <ul className="list-disc pl-5">
          {clases?.map(c => (
            <li key={c.id} className={c.activo ? 'text-green-700' : 'text-red-600'}>
              [{c.activo ? 'ACTIVO' : 'INACTIVO'}] 
              CursoID: <strong>{c.curso_id}</strong> | 
              Título: {c.titulo}
            </li>
          ))}
        </ul>
      </div>

      {authUser && (
        <div className="mb-8 p-4 border rounded bg-gray-50">
          <h2 className="font-bold text-lg mb-2">4. Inscripciones del Usuario</h2>
          <ul className="list-disc pl-5">
            {inscripciones.map(i => (
              <li key={i.id}>
                Curso: <strong>{i.curso_id}</strong> | Estado: {i.estado}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
