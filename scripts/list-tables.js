const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  try {
    console.log('Listando tablas existentes...');
    
    // Listar tablas existentes
    const { data, error } = await supabase
      .from('cursos')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error al listar tablas:', error);
    } else {
      console.log('Tablas existentes:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

listTables();