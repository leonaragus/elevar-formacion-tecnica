import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const body = await req.json();
    const { action, alumnoId, cursoId, targetCursoId } = body;

    if (!action || !alumnoId) {
      return NextResponse.json({ error: "Parámetros requeridos: action, alumnoId" }, { status: 400 });
    }

    switch (action) {
      case "delete":
        // Eliminar alumno del curso (cambiar estado a 'rechazado' o eliminar inscripción)
        const { error: deleteError } = await supabaseAdmin
          .from("cursos_alumnos")
          .delete()
          .eq("user_id", alumnoId)
          .eq("curso_id", cursoId);

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Alumno eliminado del curso" });

      case "migrate":
        // Migrar alumno a otro curso
        if (!targetCursoId) {
          return NextResponse.json({ error: "targetCursoId requerido para migración" }, { status: 400 });
        }

        // Primero eliminar del curso actual
        const { error: deleteMigrateError } = await supabaseAdmin
          .from("cursos_alumnos")
          .delete()
          .eq("user_id", alumnoId)
          .eq("curso_id", cursoId);

        if (deleteMigrateError) {
          return NextResponse.json({ error: deleteMigrateError.message }, { status: 500 });
        }

        // Luego agregar al nuevo curso
        const { error: migrateError } = await supabaseAdmin
          .from("cursos_alumnos")
          .upsert({
            user_id: alumnoId,
            curso_id: targetCursoId,
            estado: "activo",
            created_at: new Date().toISOString()
          }, { onConflict: "user_id,curso_id" });

        if (migrateError) {
          return NextResponse.json({ error: migrateError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Alumno migrado exitosamente" });

      case "duplicate":
        // Duplicar alumno en otro curso (mantener en ambos cursos)
        if (!targetCursoId) {
          return NextResponse.json({ error: "targetCursoId requerido para duplicación" }, { status: 400 });
        }

        const { error: duplicateError } = await supabaseAdmin
          .from("cursos_alumnos")
          .upsert({
            user_id: alumnoId,
            curso_id: targetCursoId,
            estado: "activo",
            created_at: new Date().toISOString()
          }, { onConflict: "user_id,curso_id" });

        if (duplicateError) {
          return NextResponse.json({ error: duplicateError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Alumno agregado al curso adicional" });

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { searchParams } = new URL(req.url);
    const alumnoId = searchParams.get("id");
    const cursoId = searchParams.get("curso_id");

    if (!alumnoId || !cursoId) {
      return NextResponse.json({ error: "Parámetros requeridos: id, curso_id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("cursos_alumnos")
      .delete()
      .eq("user_id", alumnoId)
      .eq("curso_id", cursoId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Alumno eliminado del curso" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}