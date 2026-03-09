import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// POST: Aprueba una solicitud de inscripción
export async function POST(req: NextRequest) {
  try {
    const { user_id, curso_id } = await req.json();

    if (!user_id || !curso_id) {
      throw new Error("user_id y curso_id son requeridos");
    }

    const supabase = createSupabaseAdminClient();
    
    // Actualiza el estado de la inscripción a 'aprobado'
    const { data, error } = await supabase
      .from("cursos_alumnos")
      .update({ estado: 'aprobado' })
      .match({ user_id, curso_id });

    if (error) {
      // Si el error es porque la fila no existe, la creamos (upsert manual)
      if (error.code === 'PGRST204') { // PostgREST code for "No rows updated"
        const { error: insertError } = await supabase
          .from('cursos_alumnos')
          .insert({ user_id, curso_id, estado: 'aprobado' });
        if (insertError) throw new Error(`Error al crear la inscripción (fallback): ${insertError.message}`);
      } else {
        throw new Error(`Error al aprobar la inscripción: ${error.message}`);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

// DELETE: Rechaza (elimina) una solicitud de inscripción
export async function DELETE(req: NextRequest) {
  try {
    const { user_id, curso_id } = await req.json();

    if (!user_id || !curso_id) {
      throw new Error("user_id y curso_id son requeridos");
    }

    const supabase = createSupabaseAdminClient();
    
    // Elimina la fila de la solicitud pendiente
    const { error } = await supabase
      .from("cursos_alumnos")
      .delete()
      .match({ user_id, curso_id });

    if (error) throw new Error(`Error al rechazar la inscripción: ${error.message}`);

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
