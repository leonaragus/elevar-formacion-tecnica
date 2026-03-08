import { NextRequest } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Definimos una interfaz mínima para el objeto de usuario que creamos manualmente
// para el caso de 'cookie_only', asegurando que tenga las propiedades básicas.
interface MinimalUser {
  id: string;
  email: string;
}

export async function getApiUser(request: NextRequest): Promise<{ user: User | MinimalUser | null; method: string }> {
  // 1. Intentar por Header de Autorización (JWT de Supabase Auth)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (user && !error) {
      return { user, method: 'auth' };
    }
  }

  // 2. Intentar por Cookies (tu sistema de sesión personalizado)
  const studentOk = request.cookies.get('student_ok')?.value === '1';
  const studentEmail = request.cookies.get('student_email')?.value;

  if (studentOk && studentEmail) {
    // Usamos el método robusto: listar usuarios y encontrar por email.
    // Exactamente como en tu API de login.
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      
      const foundUser = users.find(u => u.email?.toLowerCase() === studentEmail.toLowerCase());
      
      if (foundUser) {
        return { user: foundUser, method: 'cookie' };
      }
    } catch (error) {
      console.error("Error al listar usuarios en api-auth:", error);
    }

    // Si el usuario tiene la cookie de acceso pero no está en Supabase Auth (caso borde),
    // devolvemos un objeto de usuario mínimo para que la app no falle.
    return { 
      user: { id: studentEmail, email: studentEmail }, 
      method: 'cookie_only' 
    };
  }

  // Si no hay ningún método de autenticación, no hay usuario.
  return { user: null, method: 'none' };
}
