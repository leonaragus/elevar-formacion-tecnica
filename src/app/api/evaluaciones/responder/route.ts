import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const body = await req.json();
  const { evaluacionId, userId, answers, score } = body || {};
  if (!evaluacionId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const payload = {
    evaluacion_id: evaluacionId,
    user_id: userId || null,
    answers,
    score: score || null,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("evaluaciones_respuestas")
    .insert(payload)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, respuesta: data });
}
