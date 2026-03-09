import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseAdminClient } from './lib/supabase/admin';

// Función para unificar la lógica de respuesta de error de API
function apiError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // --- Protección de rutas de API ---
  if (pathname.startsWith('/api/admin')) {
    if (!session) {
      return apiError('Usuario no autenticado', 401);
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return apiError('Token de sesión inválido', 401);
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: profile, error } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();
      
    if (error || !profile) {
      console.error("Error fetching user profile for admin API route:", error);
      return apiError('Perfil de usuario no encontrado o inaccesible.', 403);
    }
    
    if ((profile as any).rol !== 'admin') {
      return apiError('Acceso denegado. Se requiere rol de administrador.', 403);
    }

    return response;
  }

  // --- Protección de rutas de UI (cliente) ---
  const protectedUiRoutes = ['/admin', '/cursos', '/perfil', '/calendario', '/clases'];
  if (protectedUiRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    if (pathname.startsWith('/admin')) {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
        const supabaseAdmin = createSupabaseAdminClient();
        const { data: profile, error } = await supabaseAdmin
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
            return NextResponse.redirect(new URL('/cursos', request.url));
        }

        if ((profile as any).rol !== 'admin') {
          return NextResponse.redirect(new URL('/cursos', request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/cursos/:path*',
    '/perfil/:path*',
    '/calendario/:path*',
    '/clases/:path*',
    '/auth',
  ],
}