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
    
    // Ejecutar cada statement usando el método directo
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Ejecutando statement ${i + 1}/${statements.length}...`);
      console.log('Statement:', statement);
      
      try {
        // Usar el método query directo
        const { error } = await supabase
          .from('pg_class')
          .select('*')
          .limit(1);
        
        if (error) {
          console.error('Error de conexión:', error);
        } else {
          console.log('Conexión exitosa');
        }
        
        // Para ejecutar SQL, necesitamos usar el método RPC con una función existente
        // o usar el método raw query si está disponible
        const { error: rpcError } = await supabase
          .rpc('exec_sql', { sql: statement });
        
        if (rpcError) {
          console.error(`Error en statement ${i + 1}:`, rpcError);
        } else {
          console.log(`Statement ${i + 1} ejecutado exitosamente`);
        }
        
      } catch (stmtError) {
        console.error(`Error en statement ${i + 1}:`, stmtError);
      }
    }
    
    console.log('¡Proceso completado!');
    
  } catch (error) {
    console.error('Error al resetear el schema:', error);
  }
}

resetSchema();