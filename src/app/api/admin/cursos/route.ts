import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET: Obtiene todos los cursos con datos agregados y las inscripciones pendientes.
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Obtener todos los cursos
    const { data: cursosData, error: cursosError } = await supabase
      .from("cursos")
      .select("*_id, titulo, descripcion, duracion, modalidad, categoria, nivel, precio, estado, imagen, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (cursosError) throw new Error(`Error fetching cursos: ${cursosError.message}`);

    // 2. Obtener todas las inscripciones (alumnos en cursos)
    const { data: inscripcionesData, error: inscripcionesError } = await supabase
      .from("cursos_alumnos")
      .select("curso_id, user_id, estado, created_at, usuarios(id, nombre, apellido, email)");

    if (inscripcionesError) throw new Error(`Error fetching inscripciones: ${inscripcionesError.message}`);

    // 3. Procesar los datos para el cliente
    const cursos = cursosData.map(c => ({
      ...c,
      // Contamos cuántos alumnos APROBADOS tiene cada curso
      alumnos_count: inscripcionesData.filter(i => i.curso_id === c.id && i.estado === 'aprobado').length,
    }));

    // Filtramos para obtener solo las inscripciones PENDIENTES
    const pendientes = inscripcionesData
      .filter(i => i.estado === 'pendiente')
      .map(p => ({
          ...p,
          // Aseguramos que el perfil del usuario (nombre, email) esté adjunto
          user_email: p.usuarios?.email ?? null,
          nombre: p.usuarios?.nombre ?? null,
          apellido: p.usuarios?.apellido ?? null,
          // Buscamos el título del curso para mostrarlo en la UI
          curso_titulo: cursosData.find(c => c.id === p.curso_id)?.titulo ?? null
      }));

    return NextResponse.json({ ok: true, cursos, pendientes });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST: Crea un nuevo curso
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("cursos")
      .insert(body)
      .select("id")
      .single();

    if (error) throw new Error(`Error creating curso: ${error.message}`);

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

// PUT: Actualiza un curso existente
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) throw new Error("ID de curso es requerido para actualizar");

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cursos")
      .update(updateData)
      .eq("id", id)
      .select("id")
      .single();

    if (error) throw new Error(`Error updating curso: ${error.message}`);

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

// DELETE: Elimina un curso
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("ID de curso es requerido para eliminar");

    const supabase = createSupabaseAdminClient();
    
    // La base de datos debe tener ON DELETE CASCADE configurado en las claves foráneas
    // para que al eliminar un curso, se eliminen todas sus dependencias (inscripciones, etc)
    const { data, error } = await supabase
      .from("cursos")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw new Error(`Error deleting curso: ${error.message}`);

    return NextResponse.json({ ok: true, deleted: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
