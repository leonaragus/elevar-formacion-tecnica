import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return { url, anonKey };
}

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  // Importante: usar NextResponse.next() y luego setear cookies en *response*.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  // Esto fuerza el refresh de sesión si corresponde.
  const { data: { user } } = await supabase.auth.getUser();

  // Rutas protegidas
  const protectedPaths = ['/cursos', '/dashboard', '/evaluaciones', '/materiales', '/pagos', '/ajustes'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));
  const isTeacherArea = request.nextUrl.pathname.startsWith('/evaluaciones/admin') || request.nextUrl.pathname.startsWith('/dashboard');
  const hasTeacherCookie = request.cookies.get('prof_code_ok')?.value === '1';
  const hasStudentDemoCookie = request.cookies.get('student_demo')?.value === '1';
  
  // Si intenta acceder a una ruta protegida sin estar autenticado, redirigir al login
  if (isProtectedPath && !user) {
    // Permitir acceso al área docente si presenta cookie de profesor
    if (isTeacherArea && hasTeacherCookie) {
      return response;
    }
    // Permitir acceso de demostración para alumno
    if (hasStudentDemoCookie) {
      return response;
    }
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Si está autenticado e intenta acceder al login/registro, redirigir a cursos
  if (user && request.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/cursos', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
