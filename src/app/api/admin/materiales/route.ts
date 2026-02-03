
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function isAuthorized(req: NextRequest) {
  // 1. Check API Token (Legacy/Script access)
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  if (token && expected && token === expected) return true;

  // 2. Check Professor Cookie (Legacy)
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  if (hasProfCookie) return true;

  // 3. Check Supabase Auth Session (Standard)
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return true; // TODO: Check if user is actually an admin if you have roles
  } catch (e) {
    console.error("Auth check error:", e);
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const curso_id = url.searchParams.get("curso_id") || "";
    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    
    // Ensure bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.find(b => b.name === bucket);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucket, { public: true });
      }
    } catch (e) {
      console.error("Bucket check error:", e);
    }

    // List files
    const list = await supabase.storage.from(bucket).list(curso_id || undefined, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (list.error) {
       console.error("Storage list error:", list.error);
       return NextResponse.json({ ok: false, error: list.error.message }, { status: 500 });
    }

    const items = Array.isArray(list?.data) ? list.data.map((it) => ({ 
      name: it.name, 
      id: it.id, 
      size: it.metadata?.size ?? null,
      created_at: it.created_at,
      mimetype: it.metadata?.mimetype
    })) : [];
    
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
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

    // Check Service Role Key for Vercel
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || serviceKey.length < 20) {
       return NextResponse.json({ 
         ok: false, 
         error: "Error de Configuración: Falta SUPABASE_SERVICE_ROLE_KEY en Vercel. No se pueden subir archivos sin permisos de administrador." 
       }, { status: 500 });
    }

    const supabase = createSupabaseAdminClient();
    const bucket = "materiales";
    
    // Ensure bucket exists
    try {
       const { data: buckets } = await supabase.storage.listBuckets();
       const bucketExists = buckets?.find(b => b.name === bucket);
       if (!bucketExists) {
         await supabase.storage.createBucket(bucket, { public: true });
       }
    } catch {}

    const nameSafe = file.name.replace(/\s+/g, "-").toLowerCase();
    // Use a timestamp to prevent overwrites and sort by date
    const path = `${curso_id}/${Date.now()}-${nameSafe}`;
    
    const res = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

    if (res.error) {
      console.error("Upload error:", res.error);
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 400 });
    }

    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    
    return NextResponse.json({ 
      ok: true, 
      url: pub.data.publicUrl, 
      path, 
      titulo: titulo || null 
    });
  } catch (e: any) {
    console.error("POST error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
