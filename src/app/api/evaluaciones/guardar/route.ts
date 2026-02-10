import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devEvaluaciones } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, questions, courseName, sourceFilename } = body || {};

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const teacher = isAuthorized(req);
    if (!teacher) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const supabase = teacher ? createSupabaseAdminClient() : await createSupabaseServerClient();

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
      const msg = String(error.message || "").toLowerCase();
      const shouldFallback =
        msg.includes("invalid api key") ||
        msg.includes("permission denied") ||
        msg.includes("row-level security") ||
        msg.includes("violates") ||
        msg.includes("not-null") ||
        msg.includes("could not find") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("column");
      if (shouldFallback) {
        const devId = `eval-${Date.now()}`;
        devEvaluaciones.push({
          id: devId,
          title,
          course_name: courseName || null,
          source_filename: sourceFilename || null,
          questions,
          created_at: new Date().toISOString(),
        });
        return NextResponse.json({ ok: true, evaluacion: { id: devId, ...insertPayload }, fallback: true });
      }
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
