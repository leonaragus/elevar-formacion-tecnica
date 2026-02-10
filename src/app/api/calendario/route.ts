import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/calendario - Obtener fechas de entrega del alumno
export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener los cursos en los que está inscrito el alumno
    const { data: inscripciones, error: inscripcionesError } = await supabase
      .from('inscripciones_cursos')
      .select('curso_id')
      .eq('alumno_id', user.id)
      .eq('estado', 'aprobado');

    if (inscripcionesError) throw inscripcionesError;

    if (!inscripciones || inscripciones.length === 0) {
      return NextResponse.json({ entregas: [] });
    }

    const cursosIds = inscripciones.map(i => i.curso_id);

    // Obtener las fechas de entrega de esos cursos
    const { data: entregas, error } = await supabase
      .from('calendario_entregas')
      .select(`
        *,
        cursos!inner(nombre),
        entregas_alumnos!left(
          estado,
          fecha_entrega,
          nota,
          observaciones,
          archivo_url
        )
      `)
      .in('curso_id', cursosIds)
      .eq('activo', true)
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ entregas });
  } catch (error) {
    console.error('Error obteniendo calendario del alumno:', error);
    return NextResponse.json(
      { error: 'Error al obtener el calendario' },
      { status: 500 }
    );
  }
}

// POST /api/calendario - Crear entrega del alumno
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { entrega_id, archivo_url, observaciones } = body;

    if (!entrega_id) {
      return NextResponse.json(
        { error: 'ID de entrega requerido' },
        { status: 400 }
      );
    }

    // Verificar que la entrega existe y está activa
    const { data: entrega, error: entregaError } = await supabase
      .from('calendario_entregas')
      .select('id, curso_id, fecha_entrega')
      .eq('id', entrega_id)
      .eq('activo', true)
      .single();

    if (entregaError || !entrega) {
      return NextResponse.json(
        { error: 'Entrega no encontrada o inactiva' },
        { status: 404 }
      );
    }

    // Verificar que el alumno está inscrito en el curso
    const { data: inscripcion, error: inscripcionError } = await supabase
      .from('inscripciones_cursos')
      .select('id')
      .eq('alumno_id', user.id)
      .eq('curso_id', entrega.curso_id)
      .eq('estado', 'aprobado')
      .single();

    if (inscripcionError || !inscripcion) {
      return NextResponse.json(
        { error: 'No estás inscrito en este curso' },
        { status: 403 }
      );
    }

    // Verificar que no ha expirado la fecha de entrega
    const fechaEntrega = new Date(entrega.fecha_entrega);
    const ahora = new Date();
    
    if (ahora > fechaEntrega) {
      return NextResponse.json(
        { error: 'La fecha de entrega ha expirado' },
        { status: 400 }
      );
    }

    // Crear o actualizar la entrega del alumno
    const { data: entregaAlumno, error } = await supabase
      .from('entregas_alumnos')
      .upsert({
        entrega_id: entrega_id,
        alumno_id: user.id,
        estado: 'entregado',
        fecha_entrega: ahora.toISOString(),
        archivo_url: archivo_url || null,
        observaciones: observaciones || null
      }, {
        onConflict: 'entrega_id,alumno_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entrega: entregaAlumno });
  } catch (error) {
    console.error('Error creando entrega del alumno:', error);
    return NextResponse.json(
      { error: 'Error al crear la entrega' },
      { status: 500 }
    );
  }
}