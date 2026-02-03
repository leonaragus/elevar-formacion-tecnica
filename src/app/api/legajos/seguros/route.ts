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
    const vencimiento: string = body.vencimiento_seguros;
    if (!cuit_cuil || !vencimiento) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const v = new Date(vencimiento);
    if (!(v instanceof Date) || isNaN(v.getTime()) || v <= new Date()) {
      return NextResponse.json({ ok: false, error: "Vencimiento inválido" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data: leg } = await supabase.from("legajos").select("id").eq("cuit_cuil", cuit_cuil).limit(1);
    const legajo_id = Array.isArray(leg) && leg.length > 0 ? leg[0].id : null;
    if (!legajo_id) {
      return NextResponse.json({ ok: false, error: "Legajo no encontrado" }, { status: 404 });
    }
    const payload: any = {
      legajo_id,
      vencimiento_seguros: vencimiento,
      poliza_art_id: body.poliza_art_id || null,
      poliza_vida_id: body.poliza_vida_id || null,
    };
    const { error } = await supabase.from("laboral_seguros").upsert(payload, { onConflict: "legajo_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
