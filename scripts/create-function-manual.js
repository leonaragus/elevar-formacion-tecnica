const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFunction() {
  try {
    console.log('Creando función exec_sql manualmente...');
    
    // Insertar la función en la tabla pg_proc
    const functionData = {
      proname: 'exec_sql',
      proargtypes: [25],  // text type
      prorettype: 22,     // void type
      prosrc: 'begin execute sql; end;',
      prolang: 1,         // plpgsql
      prosecdef: true
    };
    
    const { data, error } = await supabase
      .from('pg_proc')
      .upsert([functionData], { onConflict: 'proname' });
    
    if (error) {
      console.error('Error al crear función:', error);
    } else {
      console.log('Función creada exitosamente:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFunction();