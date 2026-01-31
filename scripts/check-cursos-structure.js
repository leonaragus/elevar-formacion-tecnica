const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCursosStructure() {
  try {
    console.log('Revisando estructura de la tabla cursos...');
    
    // Obtener información de la tabla
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error al obtener estructura:', error);
    } else {
      console.log('Estructura de cursos:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCursosStructure();