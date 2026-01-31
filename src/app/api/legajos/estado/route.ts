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
    const cuit_cuil: string = body.cuit_cuil;
    const estado_id: number = Number(body.estado_id);
    if (!cuit_cuil || ![2, 4].includes(estado_id)) {
      return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data: leg } = await supabase.from("legajos").select("id").eq("cuit_cuil", cuit_cuil).limit(1);
    const legajo_id = Array.isArray(leg) && leg.length > 0 ? leg[0].id : null;
    if (!legajo_id) {
      return NextResponse.json({ ok: false, error: "Legajo no encontrado" }, { status: 404 });
    }
    const { error } = await supabase.from("legajos").update({ estado_id }).eq("id", legajo_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
