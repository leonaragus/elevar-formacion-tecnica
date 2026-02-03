import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devEvaluaciones, devCursos } from "@/lib/devstore";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient();
  
  // Fetch evaluations (mock for now as we don't have a real table yet, or we can use devstore)
  // Ideally we should have an 'evaluaciones' table.
  // For this MVP, I'll use devEvaluaciones which I'll expose via this API.
  
  // Also fetch courses for the dropdown
  let cursos = [];
  try {
    const { data } = await supabase.from("cursos").select("id, titulo");
    cursos = data || [];
  } catch {
    cursos = devCursos.map(c => ({ id: c.id, titulo: c.titulo }));
  }

  // Format evaluations
  const evaluaciones = devEvaluaciones.map(ev => ({
    id: ev.id,
    title: ev.title,
    course_name: ev.course_name,
    created_at: ev.created_at,
    questions_count: ev.questions.length
  }));

  return NextResponse.json({ evaluaciones, cursos });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, course_id, questions } = body;
    
    if (!title || !course_id || !questions) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    
    // Get course name
    let courseName = "";
    try {
        const { data } = await supabase.from("cursos").select("titulo").eq("id", course_id).single();
        courseName = data?.titulo || "";
    } catch {}

    // Save to devstore (since we don't have a table migration for evaluations yet)
    // In a real app, this would be an INSERT into 'evaluaciones' table.
    const newEval = {
      id: `eval-${Date.now()}`,
      title,
      course_name: courseName,
      source_filename: null,
      questions: questions.map((q: any, i: number) => ({
        question: q.q,
        options: q.options,
        correctAnswer: Number(q.correct)
      })),
      created_at: new Date().toISOString()
    };
    
    devEvaluaciones.push(newEval);

    // In a real app, we would also create "asignaciones" for all students in the course.
    // For now, the student view filters evaluations by course name, so it's "auto-assigned".

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  
  const idx = devEvaluaciones.findIndex(e => e.id === id);
  if (idx !== -1) {
    devEvaluaciones.splice(idx, 1);
  }
  
  return NextResponse.json({ ok: true });
}
