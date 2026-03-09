import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './lib/database.types'

// Función principal del middleware
export async function middleware(request: NextRequest) {
  // Creamos una respuesta base que nos permita modificar las cookies más adelante
  let response = NextResponse.next({ request: { headers: request.headers } })

  // Creamos el cliente de Supabase para el entorno de servidor (middleware, route handlers)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Importante: Refresca la sesión si ha expirado. Esto es crucial.
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith('/api');

  // --- GESTIÓN DE RUTAS PÚBLICAS Y USUARIOS NO AUTENTICADOS ---
  if (!user) {
    const publicRoutes = ['/auth', '/registro', '/'];
    // Las API routes no pueden ser públicas, siempre requieren autenticación
    if (isApiRoute) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    // Si no es una ruta pública y no es el callback de auth, redirigir a login
    if (!publicRoutes.includes(pathname) && !pathname.startsWith('/auth/callback')) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    // Si es una ruta pública, permitir el acceso
    return response;
  }

  // --- LÓGICA PARA USUARIOS AUTENTICADOS ---

  // 1. Asegurar que el usuario tiene un perfil en la tabla `usuarios`
  let { data: profile } = await supabase.from('usuarios').select('role, status').eq('id', user.id).single();
  if (!profile) {
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    const userDetails = {
      id: user.id,
      nombre: user.user_metadata?.nombre || '',
      apellido: user.user_metadata?.apellido || '',
      role: isAdmin ? 'admin' : 'alumno',
      status: 'aprobado' as const
    };

    // Usamos `as any` para evitar el error de tipos de `database.types.ts`
    const { data: newProfile, error } = await supabase.from('usuarios').upsert(userDetails as any).select('role, status').single();

    if (error) {
      console.error('FATAL: Error creating profile after login:', error);
      // Si falla la creación del perfil, lo deslogueamos y mandamos a auth con un error
      await supabase.auth.signOut();
      const redirectUrl = new URL('/auth?error=profile_creation_failed', request.url);
      // Si es una llamada de API, devolvemos JSON, si no, redirigimos
      if (isApiRoute) {
        return NextResponse.json({ message: 'Profile creation failed' }, { status: 500 });
      }
      return NextResponse.redirect(redirectUrl);
    }
    profile = newProfile;
  }

  if (!profile) {
      await supabase.auth.signOut();
      if (isApiRoute) {
        return NextResponse.json({ message: 'User profile not found after creation' }, { status: 500 });
      }
      return NextResponse.redirect(new URL('/auth?error=fatal_profile_error', request.url));
  }

  const { role, status } = profile;

  // --- REGLAS DE ENRUTAMIENTO BASADAS EN ROL Y ESTADO ---

  // Regla A: Proteger el panel de admin.
  if (pathname.startsWith('/admin') && role !== 'admin') {
    if (isApiRoute) return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Regla B: Si un admin intenta acceder a rutas de alumno, redirigirlo a su dashboard.
  if (role === 'admin' && !pathname.startsWith('/admin')) {
    // Excepción: Permitir al admin acceder a la raíz para ver la landing page de alumnos.
    if (pathname !== '/' && !isApiRoute) {
       return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // Regla C: Si un alumno está pendiente, bloquearlo.
  if (role === 'alumno' && status === 'pendiente') {
    const allowedPendingRoutes = ['/'];
    if (!allowedPendingRoutes.includes(pathname)) {
      await supabase.auth.signOut();
      if (isApiRoute) return NextResponse.json({ message: 'Account is pending approval' }, { status: 403 });
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('error', 'pendiente');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Si todas las reglas pasan, se permite el acceso.
  return response;
}

// Configuración del Matcher: Ejecutar el middleware en todas las rutas excepto las estáticas.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
