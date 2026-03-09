import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

/**
 * Este cliente está configurado para usar las credenciales de administrador (service_role).
 * DEBE ser usado únicamente en el lado del servidor (Server Components, API Routes, Server Actions).
 * NUNCA debe ser expuesto al cliente/navegador.
 *
 * Lanza un error si las variables de entorno necesarias no están definidas.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Estandarizamos a una sola variable. La documentación debe reflejar esto.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Supabase URL no encontrada. Asegúrate de que NEXT_PUBLIC_SUPABASE_URL esté definida en .env.local');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Supabase Service Role Key no encontrada. Asegúrate de que SUPABASE_SERVICE_ROLE_KEY esté definida en .env.local');
}

// Creamos un singleton para el cliente de admin.
// Esto evita crear una nueva conexión en cada importación dentro del mismo ciclo de request.
const adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const createSupabaseAdminClient = () => adminClient;
