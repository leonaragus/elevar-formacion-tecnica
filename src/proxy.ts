import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anonKey };
}

export async function proxy(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ["/cursos", "/dashboard", "/evaluaciones", "/materiales", "/pagos", "/ajustes"];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  const isTeacherArea = request.nextUrl.pathname.startsWith("/evaluaciones/admin") || request.nextUrl.pathname.startsWith("/dashboard");
  const hasTeacherCookie = request.cookies.get("prof_code_ok")?.value === "1";
  
  const hasStudentDemoCookie = request.cookies.get("student_demo")?.value === "1";
  const demoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";
  
  const hasStudentEmailCookie = !!request.cookies.get("student_email")?.value;
  const hasStudentOkCookie = request.cookies.get("student_ok")?.value === "1";

  if (isProtectedPath && !user) {
    if (isTeacherArea && hasTeacherCookie) {
      return response;
    }
    if (demoEnabled && hasStudentDemoCookie) {
      return response;
    }
    if (hasStudentEmailCookie) {
      if (hasStudentOkCookie) {
        return response;
      }
      if (request.nextUrl.pathname.startsWith("/cursos")) {
        return response;
      }
      return NextResponse.redirect(new URL("/cursos", request.url));
    }
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && isProtectedPath && !hasTeacherCookie) {
    let hasActiveEnrollment: boolean | null = null;
    try {
      const { data, error } = await supabase
        .from("cursos_alumnos")
        .select("curso_id")
        .eq("user_id", user.id)
        .eq("estado", "activo")
        .limit(1);
      if (!error) {
        hasActiveEnrollment = Array.isArray(data) && data.length > 0;
      }
    } catch {
      hasActiveEnrollment = null;
    }

    if (hasActiveEnrollment === false && !request.nextUrl.pathname.startsWith("/cursos")) {
      const nextUrl = new URL("/cursos", request.url);
      nextUrl.searchParams.set("solicitud", "pendiente");
      return NextResponse.redirect(nextUrl);
    }
  }

  if (user && request.nextUrl.pathname === "/auth") {
    return NextResponse.redirect(new URL("/cursos", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
