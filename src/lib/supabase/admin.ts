import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Usamos un nombre de variable nuevo para romper cualquier cache de Vercel
  const key_admin = process.env.SUPABASE_ADMIN_KEY;
  const key_with_key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key_without_key = process.env.SUPABASE_SERVICE_ROLE;
  
  let serviceKey = key_admin || key_with_key || key_without_key;
  const source = key_admin ? "SUPABASE_ADMIN_KEY" : (key_with_key ? "SUPABASE_SERVICE_ROLE_KEY" : (key_without_key ? "SUPABASE_SERVICE_ROLE" : "NINGUNA"));
  
  if (!url) throw new Error("Supabase URL faltante");
  if (!serviceKey) throw new Error(`Supabase Service Role Key faltante. Intentado buscar en: ${source}`);

  // Limpiar absolutamente todo: espacios, nuevas líneas, comillas e interpolaciones fallidas
  const originalKey = serviceKey;
  serviceKey = serviceKey.replace(/\s/g, '').replace(/^["']|["']$/g, '');

  if (serviceKey.includes('${')) {
    throw new Error(`Error de Configuración: La variable ${source} en Vercel tiene un valor de referencia no resuelto: "${serviceKey.substring(0, 20)}...". Por favor, edita esta variable en el panel de Vercel y asegúrate de pegar la clave literal (que empieza con eyJ) en lugar de una referencia.`);
  }

  if (!serviceKey.startsWith("eyJ")) {
    console.error("CRITICAL: Supabase Service Role Key does not start with eyJ. Starts with:", serviceKey.substring(0, 10));
    throw new Error(`Supabase Service Role Key con formato inválido (empieza con ${serviceKey.substring(0, 3)}...). Asegúrate de que no tenga comillas o espacios en Vercel.`);
  }
  return { url, key: serviceKey };
}

export function createSupabaseAdminClient() {
  const { url, key } = getSupabaseAdminEnv();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
