import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devInscripciones } from "@/lib/devstore";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = formData.get("email");
    
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, error: "Email requerido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const withStudentEmail = (res: NextResponse) => {
      res.cookies.set("student_email", normalizedEmail, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: "lax",
      });
      return res;
    };

    let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      admin = createSupabaseAdminClient();
    } catch {
      admin = null;
    }

    const clearApprovedCookies = (res: NextResponse) => {
      res.cookies.set("student_ok", "0", { path: "/", maxAge: 0 });
      res.cookies.set("student_course_id", "", { path: "/", maxAge: 0 });
    };

    if (!admin) {
      // Si no hay cliente admin (ej. falta service role), intentamos verificar con devInscripciones local
      // No hacemos return aquí, dejamos que fluya hacia la verificación de devInscripciones
    } else {
      // Si hay admin, verificamos si está pendiente en DB
      const { data: intereses } = await admin
        .from("intereses")
        .select("*")
        .eq("email", normalizedEmail)
        .limit(1);

      if (Array.isArray(intereses) && intereses.length > 0) {
        const res = withStudentEmail(
          NextResponse.json({ ok: false, error: "pendiente", student_email: normalizedEmail, student_ok: false, student_course_id: null }, { status: 409 })
        );
        clearApprovedCookies(res);
        return res;
      }
    }

    let foundUserId: string | null = null;
    if (admin) {
      try {
        const { data: { users }, error: listError } = await admin.auth.admin.listUsers({
          perPage: 1000
        });
        if (!listError && users) {
          const found = users.find(u => u.email?.toLowerCase() === normalizedEmail);
          foundUserId = found?.id || null;
        }
      } catch (err) {
        console.error("Error listing users in login:", err);
        foundUserId = null;
      }
    }

    let activeCourseId: string | null = null;
    let hasPending = false;

    if (foundUserId && admin) {
      const { data: insc } = await admin
        .from("cursos_alumnos")
        .select("curso_id, estado")
        .eq("user_id", foundUserId)
        .limit(50);
      const rows = Array.isArray(insc) ? insc : [];
      const active = rows.find((r: any) => r?.estado === "activo" && r?.curso_id != null);
      if (active) activeCourseId = String(active.curso_id);
      hasPending = rows.some((r: any) => r?.estado === "pendiente");
    } else {
      // Fallback a devInscripciones si no hay admin o no se encontró user
      const rows = devInscripciones.filter((i) => i.user_id === normalizedEmail);
      const active = rows.find((r) => r.estado === "activo" && r.curso_id);
      if (active) activeCourseId = active.curso_id;
      hasPending = rows.some((r) => r.estado === "pendiente");
      
      // Si no encontramos en devInscripciones pero tenemos admin fallido, 
      // tal vez queramos permitir acceso DEMO si el email es especial? No.
    }

    if (hasPending) {
      const res = withStudentEmail(
        NextResponse.json({ ok: false, error: "pendiente", student_email: normalizedEmail, student_ok: false, student_course_id: null }, { status: 409 })
      );
      clearApprovedCookies(res);
      return res;
    }

    if (activeCourseId) {
      const res = withStudentEmail(
        NextResponse.json({ ok: true, redirect: "/cursos", student_email: normalizedEmail, student_ok: true, student_course_id: activeCourseId })
      );
      res.cookies.set("student_ok", "1", { path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
      res.cookies.set("student_course_id", activeCourseId, { path: "/", maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
      return res;
    }

    // Si no tiene cursos activos, no debería entrar como alumno "ok"
    const res = withStudentEmail(
      NextResponse.json({ ok: true, redirect: "/cursos", student_email: normalizedEmail, student_ok: false, student_course_id: null as string | null })
    );
    res.cookies.set("student_ok", "0", { path: "/", maxAge: 0 });
    res.cookies.set("student_course_id", "", { path: "/", maxAge: 0 });
    return res;
    
  } catch (error) {
    console.error("ERROR en /api/auth/login:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
