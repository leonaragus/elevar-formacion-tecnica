const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createExecSqlFunction() {
  try {
    console.log('Creando función exec_sql...');
    
    // Crear la función para ejecutar SQL
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
    
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSql });
    
    if (error) {
      console.error('Error al crear función exec_sql:', error);
    } else {
      console.log('Función exec_sql creada exitosamente');
    }
    
  } catch (error) {
    console.error('Error al crear función exec_sql:', error);
  }
}

createExecSqlFunction();