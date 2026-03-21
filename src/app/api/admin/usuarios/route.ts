import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Error de configuración de administrador" },
        { status: 500 }
      );
    }

    // Usar la API de admin de Supabase para obtener todos los usuarios registrados
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    });

    if (error) {
      console.error("Error trayendo usuarios:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedUsers = users.map((u) => {
      const meta = u.user_metadata || {};
      return {
        id: u.id,
        email: u.email || "",
        nombre: meta.nombre || meta.first_name || "",
        apellido: meta.apellido || meta.last_name || "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      };
    });

    // Ordenar de más nuevo a más viejo
    formattedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    console.error("Error GET /api/admin/usuarios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Error de configuración de administrador" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    // 1. Borrar de auth.users usando admin API
    // (Supabase cascading deletes usually handle linked public tables, but we can't be sure about every table. 
    // We will do a best-effort manual cleanup for the crucial ones like cursos_alumnos, intereses)
    
    // Manual deletion from app tables to ensure complete removal "y que se elimine todos sus registros para siempre"
    await Promise.allSettled([
      supabaseAdmin.from("cursos_alumnos").delete().eq("user_id", userId),
      supabaseAdmin.from("progreso_curso").delete().eq("alumno_id", userId),
      supabaseAdmin.from("evaluaciones_alumnos").delete().eq("alumno_id", userId),
      // Si el email es útil para borrar intereses también
    ]);

    // O también si podemos buscar su email para borrar de intereses
    const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userRecord?.user?.email) {
      await supabaseAdmin.from("intereses").delete().eq("email", userRecord.user.email);
    }

    // Borrado definitivo de Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error eliminando usuario en Auth:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Usuario eliminado completamente" });
  } catch (error: any) {
    console.error("Error DELETE /api/admin/usuarios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
