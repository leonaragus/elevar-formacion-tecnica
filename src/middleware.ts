import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './lib/database.types' // Importa el mapa REAL de la base de datos

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient<Database>( // Cliente consciente de los tipos
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

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  const publicRoutes = ['/auth', '/registro']

  // 1. SI EL USUARIO NO ESTÁ LOGUEADO
  if (!session) {
    if (!publicRoutes.includes(pathname) && !pathname.startsWith('/auth/callback') && pathname !== '/') {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    return response
  }

  // 2. SI EL USUARIO ESTÁ LOGUEADO
  // CORREGIDO: Leer de la tabla 'usuarios'
  const { data: profile } = await supabase.from('usuarios').select('role, status').eq('id', session.user.id).single()

  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth?error=profile_not_found', request.url))
  }

  const { role, status } = profile;

  // Regla A: Si un usuario logueado está en una página pública, redirigirlo.
  if (publicRoutes.includes(pathname)) {
    const url = role === 'admin' ? '/admin/dashboard' : '/';
    return NextResponse.redirect(new URL(url, request.url));
  }

  // Regla B: Proteger el panel de admin.
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Regla C: Si es admin y está fuera de su panel, redirigirlo adentro.
  if (role === 'admin' && !pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }
  
  // Regla D: Si un alumno está pendiente, expulsarlo de las rutas protegidas.
  if (role === 'alumno' && status === 'pendiente') {
    const allowedPendingRoutes = ['/']; 
    if (!allowedPendingRoutes.includes(pathname)) {
      await supabase.auth.signOut();
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('error', 'pendiente');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
