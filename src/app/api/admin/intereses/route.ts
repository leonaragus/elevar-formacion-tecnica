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
    const { email, curso_id } = await req.json();
    if (!email || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("intereses")
      .insert({ email, curso_id, when: new Date().toISOString() });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
