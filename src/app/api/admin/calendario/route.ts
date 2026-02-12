import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/admin/calendario - Obtener todas las fechas de entrega
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin o profesor
    const { data: profile, error: profileError } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'profesor'].includes(profile.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: entregas, error } = await supabase
      .from('calendario_entregas')
      .select(`
        *,
        cursos!inner(nombre)
      `)
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ entregas });
  } catch (error) {
    console.error('Error obteniendo calendario:', error);
    return NextResponse.json(
      { error: 'Error al obtener el calendario' },
      { status: 500 }
    );
  }
}

// POST /api/admin/calendario - Crear nueva fecha de entrega
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin o profesor
    const { data: profile, error: profileError } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'profesor'].includes(profile.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { curso_id, titulo, descripcion, fecha_entrega, tipo_entrega } = body;

    if (!curso_id || !titulo || !fecha_entrega || !tipo_entrega) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const { data: entrega, error } = await supabase
      .from('calendario_entregas')
      .insert([{
        curso_id,
        titulo,
        descripcion,
        fecha_entrega,
        tipo_entrega,
        created_by: user.id
      }])
      .select()
      .single();

    if (error) throw error;

    // Crear recordatorios automáticos
    const fechaEntrega = new Date(fecha_entrega);
    const recordatorios = [
      { tipo_recordatorio: '7_dias', fecha_envio: addDays(fechaEntrega, -7) },
      { tipo_recordatorio: '3_dias', fecha_envio: addDays(fechaEntrega, -3) },
      { tipo_recordatorio: '1_dia', fecha_envio: addDays(fechaEntrega, -1) }
    ];

    for (const recordatorio of recordatorios) {
      if (recordatorio.fecha_envio > new Date()) {
        await supabase.from('recordatorios_entregas').insert([{
          entrega_id: entrega.id,
          tipo_recordatorio: recordatorio.tipo_recordatorio,
          fecha_envio: recordatorio.fecha_envio.toISOString()
        }]);
      }
    }

    return NextResponse.json({ entrega });
  } catch (error) {
    console.error('Error creando fecha de entrega:', error);
    return NextResponse.json(
      { error: 'Error al crear la fecha de entrega' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/calendario - Actualizar fecha de entrega
export async function PUT(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin o profesor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'profesor'].includes(profile.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de fecha de entrega requerido' },
        { status: 400 }
      );
    }

    const { data: entrega, error } = await supabase
      .from('calendario_entregas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entrega });
  } catch (error) {
    console.error('Error actualizando fecha de entrega:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la fecha de entrega' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/calendario - Eliminar fecha de entrega
export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin o profesor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'profesor'].includes(profile.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de fecha de entrega requerido' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('calendario_entregas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Fecha de entrega eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando fecha de entrega:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la fecha de entrega' },
      { status: 500 }
    );
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
