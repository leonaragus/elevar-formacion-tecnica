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
    
    // Ejecutar cada statement usando el método RPC
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Ejecutando statement ${i + 1}/${statements.length}...`);
      console.log('Statement:', statement);
      
      try {
        // Intentar ejecutar el statement usando RPC
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`Error en statement ${i + 1}:`, error);
          
          // Si la función no existe, intentar crearla primero
          if (error.message.includes('Could not find the function public.exec_sql')) {
            console.log('Intentando crear función exec_sql...');
            
            // Crear la función usando una tabla existente
            const createFunctionSql = `
              create or replace function exec_sql(sql text)
              returns void
              language plpgsql
              security definer
              as $$
              begin
                execute sql;
              end;
              $$;
            `;
            
            const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSql });
            
            if (createError) {
              console.error('Error al crear función:', createError);
            } else {
              console.log('Función creada exitosamente');
              // Intentar ejecutar el statement original
              const { error: retryError } = await supabase.rpc('exec_sql', { sql: statement });
              if (retryError) {
                console.error(`Error en retry statement ${i + 1}:`, retryError);
              } else {
                console.log(`Statement ${i + 1} ejecutado exitosamente en retry`);
              }
            }
          }
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