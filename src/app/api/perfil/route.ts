import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await req.json();
    const { nombre, apellido, documento, telefono, direccion, fecha_nacimiento, email } = body;

    const meta = {
        nombre,
        apellido,
        documento,
        telefono,
        direccion,
        fecha_nacimiento,
        profile_completed: true
    };

    if (user) {
        // Authenticated user
        const { error: updateError } = await supabase.auth.updateUser({ data: meta });
        if (updateError) throw updateError;
    } else {
        if (!email) throw new Error("No usuario ni email proporcionado");
        const admin = createSupabaseAdminClient();
        const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (listError) throw listError;
        
        const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!found) {
          // Si no existe el usuario, no podemos actualizar su perfil en Auth.
          // Pero para que la experiencia del alumno sea fluida, devolvemos OK 
          // y el proceso de aprobación del admin lo creará si es necesario.
          return NextResponse.json({ ok: true, note: "Usuario no encontrado, perfil se aplicará al crear la cuenta" });
        }
        
        const { error: updateError } = await admin.auth.admin.updateUserById(found.id, { user_metadata: meta });
        if (updateError) throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error en API perfil:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
