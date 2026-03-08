// src/app/api/cursos/route.ts
// This is the secure server-side "butler" that prepares course data.
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // CORRECTED: Added `await` to resolve the Supabase client promise
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const adminClient = createSupabaseAdminClient();

    let cursosActivos: any[] = [];
    let cursosPendientes: any[] = [];
    let cursosDisponibles: any[] = [];

    if (user) {
      // User is logged in, fetch their specific courses
      const { data: inscripciones, error: inscripcionesError } = await adminClient
        .from('cursos_alumnos')
        .select('estado, cursos(*)') // This returns `cursos` as an array
        .eq('user_id', user.id);

      if (inscripcionesError) throw inscripcionesError;

      cursosActivos = inscripciones
        ?.filter(i => i.estado === 'activo' && Array.isArray(i.cursos) && i.cursos.length > 0)
        .map(i => i.cursos[0]) || [];

      cursosPendientes = inscripciones
        ?.filter(i => i.estado === 'pendiente' && Array.isArray(i.cursos) && i.cursos.length > 0)
        .map(i => i.cursos[0]) || [];
      
      const cursosInscritosIds = inscripciones
        ?.filter(i => Array.isArray(i.cursos) && i.cursos.length > 0)
        .map(i => i.cursos[0].id) || [];

      // Fetch available courses (those the user is not enrolled in)
      if (cursosInscritosIds.length > 0) {
        const { data: disponibles, error: disponiblesError } = await adminClient
          .from('cursos')
          .select('*')
          .eq('estado', 'publico')
          .not('id', 'in', `(${cursosInscritosIds.join(',')})`)
          .order('orden');
        
        if (disponiblesError) throw disponiblesError;
        cursosDisponibles = disponibles || [];
      } else {
        // If user has no enrolled courses, just get all public ones
        const { data: disponibles, error: disponiblesError } = await adminClient
          .from('cursos')
          .select('*')
          .eq('estado', 'publico')
          .order('orden');
        if (disponiblesError) throw disponiblesError;
        cursosDisponibles = disponibles || [];
      }

    } else {
      // User is a guest, fetch all public courses
      const { data: disponibles, error: disponiblesError } = await adminClient
        .from('cursos')
        .select('*')
        .eq('estado', 'publico')
        .order('orden');
      
      if (disponiblesError) throw disponiblesError;
      cursosDisponibles = disponibles || [];
    }

    return NextResponse.json({
      cursosActivos,
      cursosPendientes,
      cursosDisponibles,
    });

  } catch (error: any) {
    console.error('Error in /api/cursos:', error.message);
    return NextResponse.json({ error: 'Failed to fetch course data', details: error.message }, { status: 500 });
  }
}
