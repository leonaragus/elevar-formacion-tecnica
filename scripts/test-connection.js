const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Probando conexión a Supabase...');
    
    // Probar conexión con una tabla simple
    const { data, error } = await supabase
      .from('cursos')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error de conexión:', error);
    } else {
      console.log('Conexión exitosa. Tablas encontradas:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();