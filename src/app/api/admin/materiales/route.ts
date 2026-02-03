import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const curso_id = url.searchParams.get("curso_id") || "";
    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    try {
      await supabase.storage.createBucket(bucket, { public: true }).catch(() => null as any);
    } catch {}
    const list = await supabase.storage.from(bucket).list(curso_id || undefined, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
    const items = Array.isArray(list?.data) ? list.data.map((it) => ({ name: it.name, id: it.id, size: it.metadata?.size ?? null })) : [];
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Requiere form-data" }, { status: 400 });
    }
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const curso_id_raw = form.get("curso_id");
    const titulo_raw = form.get("titulo");
    const curso_id = typeof curso_id_raw === "string" ? curso_id_raw : (curso_id_raw != null ? String(curso_id_raw) : "");
    const titulo = typeof titulo_raw === "string" ? titulo_raw : (titulo_raw != null ? String(titulo_raw) : "");
    if (!file || !curso_id) {
      return NextResponse.json({ ok: false, error: "Archivo y curso_id requeridos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    try {
      await supabase.storage.createBucket(bucket, { public: true }).catch(() => null as any);
    } catch {}
    const nameSafe = file.name.replace(/\s+/g, "-").toLowerCase();
    const path = `${curso_id}/${Date.now()}-${nameSafe}`;
    const res = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (res.error) {
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 400 });
    }
    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: pub.data.publicUrl, path, titulo: titulo || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
