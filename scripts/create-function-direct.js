const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFunctionDirect() {
  try {
    console.log('Creando función exec_sql directamente...');
    
    // Usar el método directo para crear la función
    const { data, error } = await supabase
      .from('pg_proc')
      .upsert({
        proname: 'exec_sql',
        proargtypes: [25],  // text type
        prorettype: 22,     // void type
        prosrc: 'begin execute sql; end;'
      });
    
    if (error) {
      console.error('Error al crear función:', error);
    } else {
      console.log('Función creada exitosamente:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFunctionDirect();