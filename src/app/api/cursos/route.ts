
// src/app/api/cursos/route.ts
// This is the secure server-side "butler" that prepares course data.
// CACHE-BUSTER: 1
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const adminClient = createSupabaseAdminClient();

    let cursosActivos: any[] = [];
    let cursosPendientes: any[] = [];
    let cursosDisponibles: any[] = [];

    if (user) {
      // User is logged in, fetch their specific courses
      const { data: inscripciones, error: inscripcionesError } = await adminClient
        .from('cursos_alumnos')
        .select('estado, cursos(*)')
        .eq('user_id', user.id);

      if (inscripcionesError) throw inscripcionesError;

      cursosActivos = inscripciones?.filter(i => i.estado === 'activo').map(i => i.cursos) || [];
      cursosPendientes = inscripciones?.filter(i => i.estado === 'pendiente').map(i => i.cursos) || [];
      
      const cursosInscritosIds = inscripciones?.map(i => i.cursos.id) || [];

      // Fetch available courses (those the user is not enrolled in)
      const { data: disponibles, error: disponiblesError } = await adminClient
        .from('cursos')
        .select('*')
        .eq('estado', 'publico')
        .not('id', 'in', `(${cursosInscritosIds.join(',')})`)
        .order('orden');
      
      if (disponiblesError) throw disponiblesError;
      cursosDisponibles = disponibles || [];

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

  } catch (error) {
    console.error('Error in /api/cursos:', error);
    return NextResponse.json({ error: 'Failed to fetch course data' }, { status: 500 });
  }
}
