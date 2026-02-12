import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  
  if (hasHeaderOk || hasProfCookie) return true;
  if (process.env.NODE_ENV === "development") return true;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

async function resolveUserIdFromEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  // 1. Try to find existing user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });
  
  if (!listError && users) {
    const found = users.find(u => u.email?.toLowerCase() === normalized);
    if (found) return found.id;
  }

  // 2. Try to create user if not found
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: { source: 'admin_approval' }
  });

  if (created?.user?.id) return created.user.id;

  if (createError) {
    console.error(`Error creating user ${normalized}:`, createError);
  }

  return null;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({} as any));
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const userIdRaw = typeof body?.user_id === "string" ? body.user_id : "";
    const cursoIdRaw =
      (typeof body?.curso_id === "string" ? body.curso_id : "") ||
      (typeof body?.course_id === "string" ? body.course_id : "");
    const nombreRaw = typeof body?.nombre === "string" ? body.nombre : "";
    const apellidoRaw = typeof body?.apellido === "string" ? body.apellido : "";

    const email = emailRaw.trim().toLowerCase();
    const user_id = userIdRaw.trim();
    const curso_id = cursoIdRaw.trim();
    const nombre = nombreRaw.trim();
    const apellido = apellidoRaw.trim();

    if (!curso_id) {
      return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    let resolvedUserId = user_id && !user_id.includes("@") ? user_id : null;
    let resolvedEmail = email.includes("@") ? email : (user_id.includes("@") ? user_id.toLowerCase() : null);

    if (!resolvedUserId && resolvedEmail) {
      resolvedUserId = await resolveUserIdFromEmail(supabase, resolvedEmail);
    }

    if (!resolvedUserId) {
      return NextResponse.json({ ok: false, error: "No se pudo resolver el usuario (email o ID inválido)" }, { status: 400 });
    }

    // 1. Upsert into cursos_alumnos as active
    const { error: cursoError } = await supabase.from("cursos_alumnos").upsert({
      user_id: resolvedUserId,
      curso_id,
      estado: "activo",
      updated_at: new Date().toISOString()
    }, { onConflict: "curso_id,user_id" });

    if (cursoError) {
      console.error("Error approving inscription:", cursoError);
      return NextResponse.json({ ok: false, error: cursoError.message }, { status: 500 });
    }

    // 2. Clean up from intereses
    if (resolvedEmail) {
      await supabase.from("intereses").delete().eq("email", resolvedEmail).eq("course_id", curso_id);
      await supabase.from("intereses").delete().eq("email", resolvedEmail).eq("curso_id", curso_id);
    }
    
    // 3. Update user metadata if provided
    if (nombre || apellido) {
      try {
        await supabase.auth.admin.updateUserById(resolvedUserId, { 
          user_metadata: { 
            nombre: nombre || undefined, 
            apellido: apellido || undefined 
          } 
        });
      } catch (e) {
        console.error("Error updating user metadata:", e);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("Critical error in /api/admin/approve:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error interno" }, { status: 500 });
  }
}
