import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { devIntereses, devInscripciones, upsertInscripcion } from "@/lib/devstore";

export async function POST(req: NextRequest) {
  // Para inscripciones, no requerimos autenticación - el admin aprobará después
  let user: { id?: string } | null = null;
  try {
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    user = u;
  } catch {
    user = null;
  }
  const ct = req.headers.get("content-type") || "";
  const isForm = !ct.includes("application/json");
  let curso_id: string | undefined;
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({} as any));
    curso_id = typeof body?.curso_id === "string" ? body.curso_id : undefined;
  } else {
    const form = await req.formData().catch(() => null);
    const v = form?.get("curso_id");
    curso_id = typeof v === "string" ? v : (v != null ? String(v) : undefined);
  }
  if (!curso_id || typeof curso_id !== "string") {
    if (isForm) {
      return NextResponse.redirect(new URL("/cursos?error=curso_id%20requerido", req.url));
    }
    return NextResponse.json({ ok: false, error: "curso_id requerido" }, { status: 400 });
  }
  try {
    let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabaseAdmin = createSupabaseAdminClient();
    } catch {
      supabaseAdmin = null;
    }
    
    if (user?.id) {
      // Verificar si el usuario tiene nombre y apellido completos
      const supabaseServer = await createSupabaseServerClient();
      const { data: { user: currentUser } } = await supabaseServer.auth.getUser();
      
      const nombre = currentUser?.user_metadata?.nombre || '';
      const apellido = currentUser?.user_metadata?.apellido || '';
      
      // Si falta nombre o apellido, redirigir a página de completar datos
      if (!nombre.trim() || !apellido.trim()) {
        if (isForm) {
          return NextResponse.redirect(new URL(`/completar-datos?curso_id=${curso_id}`, req.url));
        }
        return NextResponse.json({ 
          ok: false, 
          error: "Datos incompletos", 
          requiere_datos: true,
          curso_id: curso_id 
        }, { status: 400 });
      }
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin
          .from("cursos_alumnos")
          .upsert({ user_id: user.id, curso_id, estado: "pendiente" }, { onConflict: "curso_id,user_id" });
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          const shouldFallback =
            msg.includes("invalid api key") ||
            msg.includes("row-level security") ||
            msg.includes("permission denied") ||
            msg.includes("violates");
          if (shouldFallback) {
            upsertInscripcion(user.id, curso_id, "pendiente");
            if (isForm) {
              return NextResponse.redirect(new URL("/cursos?solicitud=pendiente", req.url));
            }
            return NextResponse.json({ ok: true, pendiente: true });
          }
          if (isForm) {
            return NextResponse.redirect(new URL(`/cursos?error=${encodeURIComponent(error.message || "Error")}`, req.url));
          }
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        if (isForm) {
          return NextResponse.redirect(new URL("/cursos?solicitud=pendiente", req.url));
        }
        return NextResponse.json({ ok: true });
      } else {
        upsertInscripcion(user.id, curso_id, "pendiente");
        if (isForm) {
          return NextResponse.redirect(new URL("/cursos?solicitud=pendiente", req.url));
        }
        return NextResponse.json({ ok: true, pendiente: true });
      }
    } else {
      const email = req.cookies.get("student_email")?.value || "";
      if (!email) {
        if (isForm) {
          const nextUrl = new URL("/auth", req.url);
          nextUrl.searchParams.set("next", "/cursos");
          return NextResponse.redirect(nextUrl);
        }
        return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
      }
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin
          .from("intereses")
          .insert({ email, course_id: curso_id });
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          const shouldFallback =
            msg.includes("invalid api key") ||
            msg.includes("row-level security") ||
            msg.includes("permission denied") ||
            msg.includes("violates");
          if (shouldFallback) {
            devIntereses.push({ email, curso_id, when: new Date().toISOString() });
            if (isForm) {
              return NextResponse.redirect(new URL("/cursos?solicitud=pendiente", req.url));
            }
            return NextResponse.json({ ok: true, pendiente: true });
          }
          if (isForm) {
            return NextResponse.redirect(new URL(`/cursos?error=${encodeURIComponent(error.message || "Error")}`, req.url));
          }
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        if (isForm) {
          return NextResponse.redirect(new URL("/cursos?solicitud=pendiente", req.url));
        }
        return NextResponse.json({ ok: true, pendiente: true });
      } else {
        devIntereses.push({ email, curso_id, when: new Date().toISOString() });
        if (isForm) {
          return NextResponse.redirect(new URL("/cursos?solicitud=pendiente", req.url));
        }
        return NextResponse.json({ ok: true, pendiente: true });
      }
    }
  } catch (e: any) {
    if (isForm) {
      return NextResponse.redirect(new URL(`/cursos?error=${encodeURIComponent(e?.message || "Error")}`, req.url));
    }
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  let user: { id?: string } | null = null;
  try {
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    user = u;
  } catch {
    user = null;
  }
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }
  try {
    let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      supabaseAdmin = createSupabaseAdminClient();
    } catch {
      supabaseAdmin = null;
    }
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("cursos_alumnos")
        .select("curso_id, estado")
        .eq("user_id", user.id)
        .limit(20);
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        const shouldFallback =
          msg.includes("invalid api key") ||
          msg.includes("row-level security") ||
          msg.includes("permission denied") ||
          msg.includes("violates");
        if (shouldFallback) {
          const dev = devInscripciones
            .filter((i) => i.user_id === user.id)
            .map((i) => ({ curso_id: i.curso_id, estado: i.estado }));
          return NextResponse.json({ ok: true, inscripciones: dev });
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      const base = Array.isArray(data) ? data : [];
      const dev = devInscripciones
        .filter((i) => i.user_id === user.id)
        .map((i) => ({ curso_id: i.curso_id, estado: i.estado }));
      return NextResponse.json({ ok: true, inscripciones: [...base, ...dev] });
    } else {
      const dev = devInscripciones
        .filter((i) => i.user_id === user.id)
        .map((i) => ({ curso_id: i.curso_id, estado: i.estado }));
      return NextResponse.json({ ok: true, inscripciones: dev });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
