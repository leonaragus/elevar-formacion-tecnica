const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertCursosTest() {
  try {
    console.log('Insertando registro de prueba en cursos...');
    
    // Insertar un registro de prueba
    const { data, error } = await supabase
      .from('cursos')
      .insert([{
        id: 'test_course',
        titulo: 'Test Course',
        descripcion: 'Test Description',
        nivel: 'Test',
        orden: 1,
        meses: 12
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

insertCursosTest();