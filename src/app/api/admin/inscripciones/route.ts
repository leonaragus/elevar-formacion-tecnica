import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devInscripciones, upsertInscripcion, deleteInscripcion, devPerfiles, devIntereses } from "@/lib/devstore";

async function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  
  if (process.env.NODE_ENV === "development") return true;
  if (hasHeaderOk) return true;

  // Check Supabase session
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Solo permitir si hay sesión activa (admin gestiona desde el panel)
    return !!user;
  } catch {
    // ignore, continue to dev fallback
  }
  return false;
}

async function resolveUserIdFromEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  // 1. Try to find existing user by email
  // We'll use a larger perPage and potentially loop if needed, 
  // but for now 1000 should be enough for most cases.
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

  // 3. If creation failed, it might be because the user already exists but was not in the first 1000.
  // We can try to list again with a different page if we suspect there are more than 1000 users.
  // For now, let's just log the error.
  if (createError) {
    console.error(`Error creating user ${normalized}:`, createError);
  }

  return null;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const supabase = createSupabaseAdminClient();
    
    // 1. Cursos Alumnos Pendientes
    const { data: cursosAlumnos, error: caErr } = await supabase
      .from("cursos_alumnos")
      .select("user_id, curso_id, estado, created_at")
      .eq("estado", "pendiente")
      .limit(200);

    // 2. Intereses (solicitudes por email)
    const { data: intereses, error: intErr } = await supabase
      .from("intereses")
      .select("email, course_id, created_at")
      .limit(200);

    if (intErr) {
      console.error("Error fetching intereses:", intErr);
    }

    type PendingInscripcion = {
      user_id: string;
      curso_id: string;
      estado: string;
      user_email?: string | null;
      curso_titulo?: string | null;
      source?: string;
      created_at?: string;
    };

    let combined: PendingInscripcion[] = [];

    if (cursosAlumnos) {
      combined = [...cursosAlumnos.map(c => ({ ...c, source: 'db_insc' }))];
    }

    if (intereses) {
      const mapped = intereses.map((i: any) => ({
        user_id: i.email,
        curso_id: i.course_id,
        user_email: i.email,
        nombre: "",
        apellido: "",
        estado: "pendiente",
        source: "intereses",
        created_at: i.created_at
      }));
      combined = [...combined, ...mapped];
    }

    // Unique by user and course
    const unique = combined.filter(
      (v, i, a) => a.findIndex((t) => t.user_id === v.user_id && t.curso_id === v.curso_id) === i
    );

    // Get User and Course info
    const userIds = unique.filter(item => !item.user_id.includes('@')).map(item => item.user_id);
    const emails = unique.filter(item => item.user_id.includes('@')).map(item => item.user_id);
    const courseIds = unique.map(item => item.curso_id);

    let userInfo: Record<string, any> = {};
    let courseInfo: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users) {
        users.forEach(u => {
          if (userIds.includes(u.id)) {
            userInfo[u.id] = { 
              email: u.email, 
              nombre: u.user_metadata?.nombre || "", 
              apellido: u.user_metadata?.apellido || "" 
            };
          }
        });
      }
    }

    if (courseIds.length > 0) {
      const { data: courses } = await supabase.from('cursos').select('id, titulo').in('id', courseIds);
      if (courses) {
        courses.forEach(c => { courseInfo[c.id] = c.titulo; });
      }
    }

    const enriched = unique.map(item => {
      const isEmail = item.user_id.includes('@');
      const email = isEmail ? item.user_id : (userInfo[item.user_id]?.email || item.user_id);
      
      const nombre = isEmail ? "" : (userInfo[item.user_id]?.nombre || "");
      const apellido = isEmail ? "" : (userInfo[item.user_id]?.apellido || "");
      
      return {
        ...item,
        user_email: email,
        curso_titulo: courseInfo[item.curso_id] || item.curso_id,
        nombre,
        apellido
      };
    });

    const sorted = enriched.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({ ok: true, pendientes: sorted });
  } catch (e: any) {
    console.error("Error in Admin Inscriptions GET:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { user_id, curso_id } = await req.json();
    if (!user_id || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    let targetUserId = String(user_id).trim();
    const isEmail = targetUserId.includes("@");

    if (isEmail) {
      const resolved = await resolveUserIdFromEmail(supabase, targetUserId);
      if (!resolved) {
        return NextResponse.json({ ok: false, error: "No se pudo encontrar o crear el usuario para ese email" }, { status: 400 });
      }
      targetUserId = resolved;
    }

    // 1. Upsert into cursos_alumnos as active
    const { error: upsertError } = await supabase
      .from("cursos_alumnos")
      .upsert({ 
        user_id: targetUserId, 
        curso_id, 
        estado: "activo"
      }, { onConflict: "curso_id,user_id" });

    if (upsertError) {
      console.error("Error upserting inscription:", upsertError);
      return NextResponse.json({ ok: false, error: upsertError.message }, { status: 400 });
    }

    // 2. Clean up from intereses if it was an email-based request
    if (isEmail) {
      const email = String(user_id).toLowerCase();
      await supabase.from("intereses").delete().eq("email", email).eq("course_id", curso_id);
      await supabase.from("intereses").delete().eq("email", email).eq("curso_id", curso_id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Error in Admin Inscriptions POST:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const { user_id, curso_id } = await req.json();
    if (!user_id || !curso_id) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    let targetUserId = String(user_id).trim();
    const isEmail = targetUserId.includes("@");

    // 1. Try to delete from intereses (if it was an email-based request)
    if (isEmail) {
      const email = targetUserId.toLowerCase();
      await supabase.from("intereses").delete().eq("email", email).eq("course_id", curso_id);
      await supabase.from("intereses").delete().eq("email", email).eq("curso_id", curso_id);
      
      // Also resolve email to user_id for deleting from cursos_alumnos
      const resolved = await resolveUserIdFromEmail(supabase, email);
      if (resolved) targetUserId = resolved;
    }

    // 2. Delete from cursos_alumnos
    const { error } = await supabase
      .from("cursos_alumnos")
      .delete()
      .eq("user_id", targetUserId)
      .eq("curso_id", curso_id);

    if (error) {
      console.error("Error deleting inscription:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Error in Admin Inscriptions DELETE:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
