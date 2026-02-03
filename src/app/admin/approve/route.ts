import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, course_id } = await req.json();
    if (!email || !course_id) {
      return NextResponse.json({ error: "Faltan datos (email o course_id)" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Obtener o crear usuario Auth
    let user_id: string | null = null;
    
    // Buscar si existe en legajos primero
    const { data: legajo } = await supabase.from("legajos").select("alumno_id").eq("email", email).single();
    if (legajo) {
        user_id = legajo.alumno_id;
    } else {
        // Intentar crear usuario
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { role: 'alumno' }
        });
        
        if (user?.user) {
            user_id = user.user.id;
        } else {
             // Si ya existe en Auth pero no en legajos, buscarlo
             const { data: users } = await supabase.auth.admin.listUsers();
             const found = users.users.find(u => u.email === email);
             if (found) user_id = found.id;
        }
    }

    if (!user_id) {
        return NextResponse.json({ error: "No se pudo obtener ID de usuario" }, { status: 500 });
    }

    // 2. Crear/Actualizar Legajo
    const { error: legajoError } = await supabase.from("legajos").upsert({
        alumno_id: user_id,
        email: email,
        nombre: "Alumno", // Podríamos mejorar esto si tuviéramos el nombre en 'intereses'
        apellido: "Nuevo",
        estado: "activo",
    }, { onConflict: "email" });

    if (legajoError) {
        console.error("Legajo error", legajoError);
    }

    // 3. Inscribir en curso
    const { error: cursoError } = await supabase.from("cursos_alumnos").upsert({
        user_id: user_id,
        curso_id: course_id,
        estado: "activo"
    });

    if (cursoError) return NextResponse.json({ error: cursoError.message }, { status: 500 });

    // 4. Borrar de intereses (solicitud pendiente)
    await supabase.from("intereses").delete().eq("email", email).eq("course_id", course_id);

    // 5. TODO: Enviar email de notificación
    // console.log(`[Email] Enviando notificación de aprobación a ${email} para el curso ${course_id}`);

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("Approve error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
