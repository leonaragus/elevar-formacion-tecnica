import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const cuit_cuil: string = body.cuit_cuil;
    if (!cuit_cuil) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data: leg } = await supabase.from("legajos").select("id,foto_url").eq("cuit_cuil", cuit_cuil).limit(1);
    const legajo = Array.isArray(leg) && leg.length > 0 ? leg[0] : null;
    if (!legajo) {
      return NextResponse.json({ ok: false, error: "Legajo no encontrado" }, { status: 404 });
    }
    if (!legajo.foto_url) {
      return NextResponse.json({ ok: false, error: "Falta foto" }, { status: 400 });
    }
    const { data: seg } = await supabase.from("laboral_seguros").select("vencimiento_seguros").eq("legajo_id", legajo.id).limit(1);
    const venc = Array.isArray(seg) && seg.length > 0 ? new Date(seg[0].vencimiento_seguros) : null;
    if (!venc || venc <= new Date()) {
      return NextResponse.json({ ok: false, error: "Seguros vencidos o faltantes" }, { status: 400 });
    }
    const { error } = await supabase.from("legajos").update({ estado_id: 3 }).eq("id", legajo.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
