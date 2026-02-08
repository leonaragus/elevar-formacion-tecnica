import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devEvaluaciones, devCursos } from "@/lib/devstore";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient();
  let cursos: any[] = [];
  try {
    const { data } = await supabase.from("cursos").select("id, titulo");
    cursos = Array.isArray(data) ? data : [];
  } catch {
    cursos = devCursos.map(c => ({ id: c.id, titulo: c.titulo }));
  }

  try {
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("id,title,course_name,questions,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const evaluaciones = (Array.isArray(data) ? data : []).map((ev: any) => ({
      id: ev.id,
      title: ev.title,
      course_name: ev.course_name,
      created_at: ev.created_at,
      questions_count: Array.isArray(ev.questions) ? ev.questions.length : (typeof ev.questions === 'object' && ev.questions != null ? Object.keys(ev.questions).length : 0),
    }));
    return NextResponse.json({ evaluaciones, cursos });
  } catch {
    const evaluaciones = devEvaluaciones.map(ev => ({
      id: ev.id,
      title: ev.title,
      course_name: ev.course_name,
      created_at: ev.created_at,
      questions_count: ev.questions.length
    }));
    return NextResponse.json({ evaluaciones, cursos });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, course_id, questions, tipo_evaluacion, material_id, unidad } = body;
    if (!title || !course_id || !questions) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    let courseName = "";
    try {
      const { data } = await supabase.from("cursos").select("titulo").eq("id", course_id).single();
      courseName = data?.titulo || "";
    } catch {}

    const payload = {
      title,
      course_name: courseName,
      questions: Array.isArray(questions)
        ? questions.map((q: any) => ({ question: q.q, options: q.options, correctAnswer: Number(q.correct) }))
        : questions,
      tipo_evaluacion: tipo_evaluacion || "general",
      material_id: material_id || null,
      unidad: unidad || null,
    } as any;

    const { error } = await supabase.from("evaluaciones").insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  
  console.log("Intentando eliminar evaluación con ID:", id);
  
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("evaluaciones").delete().eq("id", id);
  
  if (error) {
    console.error("Error al eliminar evaluación:", error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code 
    }, { status: 400 });
  }
  
  console.log("Evaluación eliminada exitosamente:", id);
  return NextResponse.json({ ok: true });
}
