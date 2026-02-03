import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { upsertInscripcion } from "@/lib/devstore";

export async function POST(req: NextRequest) {
  // Endpoint de prueba SIN autenticación
  try {
    const body = await req.json().catch(() => ({} as any));
    const curso_id = typeof body?.curso_id === "string" ? body.curso_id : undefined;
    
    if (!curso_id) {
      return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
    }

    // Crear user_id temporal
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Intentar guardar en Supabase
    let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabaseAdmin = createSupabaseAdminClient();
      const { error } = await supabaseAdmin
        .from("cursos_alumnos")
        .insert({ user_id: tempUserId, curso_id, estado: "pendiente" });
      
      if (error) {
        // Fallback a devstore si hay error
        upsertInscripcion(tempUserId, curso_id, "pendiente");
        return NextResponse.json({ ok: true, pendiente: true, message: "Guardado en devstore" });
      }
      
      return NextResponse.json({ ok: true, pendiente: true, message: "Guardado en Supabase" });
      
    } catch (e) {
      // Error creando supabaseAdmin, usar devstore
      upsertInscripcion(tempUserId, curso_id, "pendiente");
      return NextResponse.json({ ok: true, pendiente: true, message: "Guardado en devstore (error admin)" });
    }
    
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}