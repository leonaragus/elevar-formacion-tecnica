import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nombre, apellido, documento, telefono, direccion, fecha_nacimiento } = body;

    // Actualizamos user_metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        nombre,
        apellido,
        documento,
        telefono,
        direccion,
        fecha_nacimiento,
        profile_completed: true
      }
    });

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
