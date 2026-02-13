import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Check 'intereses' table
    const { data: intereses, error: intErr } = await supabase
      .from("intereses")
      .select("*")
      .limit(5);
      
    // Check 'cursos_alumnos' table
    const { data: ca, error: caErr } = await supabase
      .from("cursos_alumnos")
      .select("*")
      .eq("estado", "pendiente")
      .limit(5);

    // Check 'cursos' table
    const { data: cursos, error: cErr } = await supabase
      .from("cursos")
      .select("id, titulo")
      .limit(5);

    // Check 'legajos' table
    const { data: legajos, error: legErr } = await supabase
      .from("legajos")
      .select("*")
      .limit(5);

    // Check 'perfiles' table
    const { data: perfiles, error: perfErr } = await supabase
      .from("perfiles")
      .select("*")
      .limit(5);

    return NextResponse.json({
      ok: true,
      intereses: {
        count: intereses?.length || 0,
        error: intErr,
        columns: intereses?.[0] ? Object.keys(intereses[0]) : null
      },
      legajos: {
        count: legajos?.length || 0,
        error: legErr,
        columns: legajos?.[0] ? Object.keys(legajos[0]) : null
      },
      perfiles: {
        count: perfiles?.length || 0,
        error: perfErr,
        columns: perfiles?.[0] ? Object.keys(perfiles[0]) : null
      },
      cursos_alumnos: {
        count: ca?.length || 0,
        error: caErr,
        columns: ca?.[0] ? Object.keys(ca[0]) : null
      },
      cursos: {
        count: cursos?.length || 0,
        error: cErr
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
