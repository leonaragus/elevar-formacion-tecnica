
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Si hay un código en la URL, Supabase puede intercambiarlo por una sesión
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    // Si el intercambio de código es exitoso
    if (!exchangeError) {
      // Obtenemos el usuario recién autenticado
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmail = process.env.ADMIN_EMAIL;

      // Comparamos el email del usuario con el del administrador (desde variables de entorno)
      if (user && adminEmail && user.email === adminEmail) {
        // Si es el administrador, redirigir al dashboard de admin
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }

      // Para cualquier otro usuario, redirigir a la página principal
      return NextResponse.redirect(`${origin}/`);
    }

    // Si hubo un error en el intercambio de código
    console.error('Error exchanging code for session:', exchangeError.message);
  }

  // Si no hay código o hubo un error, redirigir a una página de error genérica
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
