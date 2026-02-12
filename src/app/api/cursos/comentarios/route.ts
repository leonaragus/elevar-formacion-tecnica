import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const cursoId = String(url.searchParams.get("curso_id") || "").trim();
    if (!cursoId) {
      return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
    }
    let admin: any = null;
    try { admin = createSupabaseAdminClient(); } catch { admin = null; }
    const client = admin || (await createSupabaseServerClient());

    const { data: clases } = await client
      .from("clases_grabadas")
      .select("id, titulo")
      .eq("curso_id", cursoId)
      .eq("activo", true)
      .eq("es_activo", true)
      .limit(200);
    const claseIds = Array.isArray(clases) ? clases.map((c: any) => String(c.id)) : [];
    if (claseIds.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }
    const { data: comentarios } = await client
      .from("clases_comentarios")
      .select("id, clase_id, author_id, author_email, texto, created_at")
      .in("clase_id", claseIds)
      .order("created_at", { ascending: false })
      .limit(200);
    const mapTitulo = new Map((clases || []).map((c: any) => [String(c.id), String(c.titulo || "")]));
    const items = (comentarios || []).map((c: any) => ({
      id: String(c.id),
      clase_id: String(c.clase_id),
      clase_titulo: mapTitulo.get(String(c.clase_id)) || "",
      author_id: c.author_id || null,
      author_email: c.author_email || null,
      texto: String(c.texto || ""),
      created_at: String(c.created_at || new Date().toISOString()),
    }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
