
import { createClient } from '@supabase/supabase-js';

// Hardcoded values from your environment - this is a temporary solution for this script
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Las variables de entorno de Supabase no están configuradas.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createCourse() {
  const titulo = "Curso de Prueba Gemini";
  const idBase = titulo.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 64);
  const id = idBase || `curso-${Date.now()}`;

  try {
    // Primero, intenta eliminar cualquier curso con el mismo ID para asegurar que el script sea repetible
    await supabaseAdmin.from("cursos").delete().eq("id", id);

    // Ahora, inserta el nuevo curso
    const { data, error } = await supabaseAdmin
      .from("cursos")
      .insert({ 
        id, 
        titulo, 
        descripcion: "Un curso para probar el flujo",
        estado: "activo"
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    if (data && data.id) {
      console.log(data.id); // Imprime solo el ID para que pueda ser capturado
    } else {
       throw new Error("No se pudo obtener el ID del curso creado.");
    }
  } catch (error) {
    console.error(`Error en el script de creación de curso: ${error.message}`);
    process.exit(1);
  }
}

createCourse();
