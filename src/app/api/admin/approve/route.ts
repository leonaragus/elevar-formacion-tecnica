import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devIntereses, upsertInscripcion } from "@/lib/devstore";

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.headers.get("X-Admin-Token");
  const expected = process.env.ADMIN_TOKEN;
  const hasHeaderOk = Boolean(token && expected && token === expected);
  const hasProfCookie = req.cookies.get("prof_code_ok")?.value === "1";
  return hasHeaderOk || hasProfCookie;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({} as any));
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const userIdRaw = typeof body?.user_id === "string" ? body.user_id : "";
    const cursoIdRaw =
      (typeof body?.curso_id === "string" ? body.curso_id : "") ||
      (typeof body?.course_id === "string" ? body.course_id : "");

    const email = emailRaw.trim().toLowerCase();
    const user_id = userIdRaw.trim();
    const curso_id = cursoIdRaw.trim();

    if (!curso_id) {
      return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    let resolvedUserId = user_id && !user_id.includes("@") ? user_id : null;
    let resolvedEmail = email.includes("@") ? email : null;

    if (!resolvedUserId && !resolvedEmail && user_id.includes("@")) {
      resolvedEmail = user_id.toLowerCase();
    }

    if (!resolvedUserId) {
      if (!resolvedEmail) {
        return NextResponse.json({ ok: false, error: "email o user_id requerido" }, { status: 400 });
      }
      const created = await supabase.auth.admin
        .createUser({ email: resolvedEmail, email_confirm: true })
        .catch(() => null as any);
      const createdId = created?.data?.user?.id ?? null;
      if (createdId) {
        resolvedUserId = createdId;
      } else {
        const listed = await supabase.auth.admin
          .listUsers({ page: 1, perPage: 1000 })
          .catch(() => null as any);
        const users = Array.isArray(listed?.data?.users) ? listed.data.users : [];
        const found = users.find((u: any) => String(u?.email || "").toLowerCase() === resolvedEmail);
        resolvedUserId = typeof found?.id === "string" ? found.id : null;
      }
    }

    if (!resolvedUserId) {
      if (resolvedEmail) {
        upsertInscripcion(resolvedEmail, curso_id, "activo");
        const idx = devIntereses.findIndex((i) => i.email === resolvedEmail && i.curso_id === curso_id);
        if (idx >= 0) devIntereses.splice(idx, 1);
        await supabase.from("intereses").delete().eq("email", resolvedEmail).eq("course_id", curso_id);
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, error: "No se pudo resolver user_id" }, { status: 500 });
    }

    const { error: cursoError } = await supabase.from("cursos_alumnos").upsert({
      user_id: resolvedUserId,
      curso_id,
      estado: "activo",
    }, { onConflict: "curso_id,user_id" });

    if (cursoError) {
      const msg = String(cursoError.message || "").toLowerCase();
      const shouldFallback =
        msg.includes("invalid api key") ||
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("violates");
      if (shouldFallback) {
        upsertInscripcion(resolvedEmail || resolvedUserId, curso_id, "activo");
        if (resolvedEmail) {
          const idx = devIntereses.findIndex((i) => i.email === resolvedEmail && i.curso_id === curso_id);
          if (idx >= 0) devIntereses.splice(idx, 1);
          await supabase.from("intereses").delete().eq("email", resolvedEmail).eq("course_id", curso_id);
        }
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, error: cursoError.message }, { status: 500 });
    }

    if (resolvedEmail) {
      await supabase.from("intereses").delete().eq("email", resolvedEmail).eq("course_id", curso_id);
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
