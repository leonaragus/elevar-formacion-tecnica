import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  return token && expected && token === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const supabase = createSupabaseAdminClient();
    const payload: any = {
      foto_url: body.foto_url,
      nacionalidad: body.nacionalidad,
      apellido: body.apellido,
      nombre: body.nombre,
      cuit_cuil: body.cuit_cuil,
      tipo_doc: body.tipo_doc,
      nro_doc: body.nro_doc,
      fecha_nacimiento: body.fecha_nacimiento,
      nivel_instruccion: body.nivel_instruccion,
      puesto_empresa: body.puesto_empresa,
      diagrama_trabajo: body.diagrama_trabajo,
      horas_normales: body.horas_normales ?? 8,
      relacion_laboral: body.relacion_laboral,
      fecha_inicio: body.fecha_inicio,
      situacion_gremial: body.situacion_gremial,
      poliza_art_id: body.poliza_art_id || null,
      poliza_vida_id: body.poliza_vida_id || null,
      estado_id: 1,
    };
    const { error } = await supabase.from("legajos").upsert(payload, { onConflict: "cuit_cuil" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
