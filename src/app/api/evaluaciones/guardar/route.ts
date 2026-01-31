import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, questions, courseName, sourceFilename } = body || {};

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const insertPayload = {
      title,
      questions,
      course_name: courseName || null,
      source_filename: sourceFilename || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("evaluaciones")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, evaluacion: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
