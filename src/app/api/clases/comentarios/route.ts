import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const claseId = String(url.searchParams.get("clase_id") || "").trim();
    if (!claseId) {
      return NextResponse.json({ ok: false, error: "clase_id requerido" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clases_comentarios")
      .select("id, clase_id, author_id, author_email, texto, created_at")
      .eq("clase_id", claseId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const claseId = String(body?.clase_id || "").trim();
    const texto = String(body?.texto || "").trim();
    if (!claseId || !texto) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }
    if (texto.length > 5000) {
      return NextResponse.json({ ok: false, error: "Texto demasiado largo" }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    const server = await createSupabaseServerClient();
    const { data: userData } = await server.auth.getUser();
    const user = userData?.user || null;
    const emailCookie = req.cookies.get("student_email")?.value;
    const authorEmail = user?.email || emailCookie || null;
    const authorId = user?.id || null;
    const insert = {
      clase_id: claseId,
      texto,
      author_id: authorId,
      author_email: authorEmail,
    };
    const { error } = await admin.from("clases_comentarios").insert(insert).select("id").single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
