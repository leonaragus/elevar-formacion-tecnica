const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFunctionViaInsert() {
  try {
    console.log('Creando función exec_sql a través de insert...');
    
    // Insertar un registro en la tabla cursos para crear la función
    const { data, error } = await supabase
      .from('cursos')
      .insert([{
        id: 'exec_sql_function',
        titulo: 'Function for SQL execution',
        descripcion: 'Temporary function for SQL execution',
        nivel: 'admin',
        orden: 9999,
        meses: 1
      }]);
    
    if (error) {
      console.error('Error al insertar registro:', error);
    } else {
      console.log('Registro insertado exitosamente:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFunctionViaInsert();