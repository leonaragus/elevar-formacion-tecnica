import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  if (token && expected && token === expected) return true;
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  if (hasProfCookie) return true;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    // Fallback: allow if request comes from Admin UI on same host
    try {
      const ref = req.headers.get("referer") || "";
      const origin = req.headers.get("origin") || "";
      if (ref) {
        const u = new URL(ref);
        const sameHost = u.hostname && req.nextUrl.hostname && u.hostname === req.nextUrl.hostname;
        const isAdminPath = u.pathname.startsWith("/admin");
        if (sameHost && isAdminPath) return true;
      }
      if (origin) {
        const o = new URL(origin);
        const sameHost = o.hostname && req.nextUrl.hostname && o.hostname === req.nextUrl.hostname;
        if (sameHost) return true;
      }
    } catch {}
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cursoId = url.searchParams.get("curso_id") || "";
  
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("mensajes").select("*").order("created_at", { ascending: false });
    
    if (cursoId) {
        query = query.eq("curso_id", cursoId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ ok: true, mensajes: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const ct = req.headers.get("content-type") || "";
    const isForm = !ct.includes("application/json");
    let body: any = {};
    if (!isForm) {
      body = await req.json().catch(() => ({}));
    } else {
      const form = await req.formData();
      body = {
        titulo: form.get("titulo"),
        contenido: form.get("contenido"),
        curso_id: form.get("curso_id"),
        action: form.get("action"),
        id: form.get("path") || form.get("id"), // Support both for compatibility
        return_to: form.get("return_to")
      };
    }

    const action = typeof body.action === "string" ? body.action.trim() : "";
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const returnTo = typeof body.return_to === "string" ? body.return_to.trim() : "";
    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    const contenido = typeof body.contenido === "string" ? body.contenido.trim() : "";
    const cursoId = typeof body.curso_id === "string" ? body.curso_id.trim() : "";

    const supabase = createSupabaseAdminClient();

    if (action === "delete" && id) {
      // Try to delete from DB
      const { error } = await supabase.from("mensajes").delete().eq("id", id);
      
      // Also try to delete from storage just in case it was a legacy message (path style)
      if (id.includes("/")) {
          try {
              await supabase.storage.from("mensajes").remove([id]);
          } catch {}
      }

      if (error && !id.includes("/")) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      
      if (isForm) {
        const redirectUrl = new URL(returnTo || "/admin/dashboard?ok=deleted", req.url);
        return NextResponse.redirect(redirectUrl, { status: 303 });
      }
      return NextResponse.json({ ok: true, deleted: id });
    }

    if (!titulo || !contenido) return NextResponse.json({ ok: false, error: "Título y contenido requeridos" }, { status: 400 });

    const { error } = await supabase.from("mensajes").insert({
        titulo,
        contenido,
        curso_id: cursoId || null,
        created_at: new Date().toISOString()
    });
    
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    if (isForm) {
      const redirectUrl = new URL(returnTo || "/admin/dashboard?ok=published", req.url);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
