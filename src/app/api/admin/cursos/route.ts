import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET: Obtiene todos los cursos con métricas de alumnos (eficiente)
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    // Llamamos a la función RPC de la base de datos que hace todo el trabajo pesado.
    // Esto es mucho más eficiente que traer todas las tablas y procesarlas en JS.
    const { data: cursos, error } = await supabase.rpc('get_cursos_con_metricas');

    if (error) {
      throw new Error(`Error al obtener cursos con métricas: ${error.message}`);
    }

    return NextResponse.json({ ok: true, cursos });

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

    if (error) throw new Error(`Error al crear el curso: ${error.message}`);

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    // Si el body no es JSON válido, req.json() falla y entra aquí.
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

// PUT: Actualiza un curso existente
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) throw new Error("El ID del curso es requerido para actualizar");

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cursos")
      .update(updateData)
      .eq("id", id)
      .select("id")
      .single();

    if (error) throw new Error(`Error al actualizar el curso: ${error.message}`);

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

    if (!id) throw new Error("El ID del curso es requerido para eliminar");

    const supabase = createSupabaseAdminClient();
    
    // La BD debe tener ON DELETE CASCADE configurado para eliminar dependencias.
    const { error } = await supabase
      .from("cursos")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error al eliminar el curso: ${error.message}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
