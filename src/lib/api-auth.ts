import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getApiUser(request: NextRequest) {
  // 1. Intentar por Header de Autorización (JWT)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (user && !error) {
      return { user, method: 'auth' };
    }
  }

  // 2. Intentar por Cookies (Sesión de email)
  const studentOk = request.cookies.get('student_ok')?.value === '1';
  const studentEmail = request.cookies.get('student_email')?.value;

  if (studentOk && studentEmail) {
    // Buscar el usuario por email usando el admin client
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserByEmail(studentEmail);
    
    if (user && !error) {
      return { user, method: 'cookie' };
    }

    // Si no existe en Auth pero tiene el ok, podemos devolver un objeto "user" mínimo
    return { 
      user: { id: studentEmail, email: studentEmail }, 
      method: 'cookie_only' 
    };
  }

  return { user: null, method: 'none' };
}
