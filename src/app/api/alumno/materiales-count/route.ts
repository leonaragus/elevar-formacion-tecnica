import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecent(createdAt?: string | null, days = 3) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export async function GET(req: NextRequest) {
  const studentOk = req.cookies.get("student_ok")?.value === "1";
  const studentCourseId = req.cookies.get("student_course_id")?.value;

  let cursoId = typeof studentCourseId === "string" && studentCourseId ? studentCourseId : "";

  if (!cursoId) {
    try {
      const supabaseServer = await createSupabaseServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user?.id) {
        const { data } = await supabaseServer
          .from("cursos_alumnos")
          .select("curso_id")
          .eq("user_id", user.id)
          .eq("estado", "activo")
          .limit(1);
        const row = Array.isArray(data) ? data[0] : null;
        if (row?.curso_id != null) cursoId = String(row.curso_id);
      }
    } catch {
      cursoId = "";
    }
  }

  if (!cursoId || (!studentOk && !cursoId)) {
    return NextResponse.json({ ok: true, count: 0, newCount: 0, cursoId: cursoId || null });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage.from("materiales").list(cursoId, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, count: 0, newCount: 0, cursoId });
    }

    const files = Array.isArray(data) ? data : [];
    const onlyDocs = files.filter(
      (f) => f.name !== "glosarios" && !(f.metadata?.mimetype || "").includes("directory")
    );

    const count = onlyDocs.length;
    const newCount = onlyDocs.filter((f) => isRecent(f.created_at, 3)).length;

    return NextResponse.json({ ok: true, count, newCount, cursoId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error", count: 0, newCount: 0, cursoId });
  }
}

