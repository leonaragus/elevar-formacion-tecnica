const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFunction() {
  try {
    console.log('Creando función exec_sql a través de la tabla cursos...');
    
    // Usar la tabla cursos para crear una función temporal
    const { data, error } = await supabase
      .from('cursos')
      .insert([{
        id: 'temp_exec_sql',
        titulo: 'temp_function',
        descripcion: 'Temporary function for SQL execution',
        nivel: 'temp',
        duracion: 'temp',
        profesor: 'temp',
        orden: 9999,
        meses: 1
      }]);
    
    if (error) {
      console.error('Error al insertar registro temporal:', error);
    } else {
      console.log('Registro temporal insertado:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFunction();