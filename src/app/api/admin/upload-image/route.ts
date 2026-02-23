
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function isAuthorized(req: NextRequest) {
  // 1. Check for admin token header (optional but good for debugging/scripts)
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  
  // 2. Check for professor cookie (legacy/simple auth)
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  
  if (hasHeaderOk || hasProfCookie) return true;

  try {
    // 3. Check standard Supabase session
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return true;
  } catch (e) {
    console.error("Auth check error:", e);
  }
  return false;
}

export async function POST(req: NextRequest) {
  const isAuth = await isAuthorized(req);
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ ok: false, error: "No se encontró el archivo" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    
    // Sanitizar nombre de archivo
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Convertir File a Buffer para subir con admin client (node environment)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('curso_meta')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error upload:", uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from('curso_meta').getPublicUrl(filePath);
    
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (e: any) {
    console.error("Error handling upload:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
