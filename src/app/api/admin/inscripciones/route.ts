import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET: Obtiene inscripciones, opcionalmente filtradas por estado.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // El cliente puede pasar ?estado=pendiente, ?estado=aprobado, etc.
    const estado = searchParams.get("estado");

    const supabase = createSupabaseAdminClient();

    // Llamamos a la función RPC, pasando el estado como parámetro.
    // Si el estado es null, la función devolverá todas las inscripciones.
    const { data: inscripciones, error } = await supabase.rpc(
      'get_inscripciones_enriquecidas',
      { p_estado: estado }
    );

    if (error) {
      throw new Error(`Error al obtener inscripciones enriquecidas: ${error.message}`);
    }

    return NextResponse.json({ ok: true, inscripciones });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
