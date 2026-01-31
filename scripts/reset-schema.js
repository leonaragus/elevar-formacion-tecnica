const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetSchema() {
  try {
    console.log('Iniciando reset del schema...');
    
    // Leer el archivo SQL
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '..', 'supabase', 'sql', 'core_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir el SQL en statements individuales
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Ejecutando ${statements.length} statements...`);
    
    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Ejecutando statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error en statement ${i + 1}:`, error);
        console.error('Statement:', statement);
      } else {
        console.log(`Statement ${i + 1} ejecutado exitosamente`);
      }
    }
    
    console.log('¡Schema reseteado exitosamente!');
    
  } catch (error) {
    console.error('Error al resetear el schema:', error);
  }
}

resetSchema();