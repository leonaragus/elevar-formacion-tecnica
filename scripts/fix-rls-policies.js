const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixRLSPolicies() {
  console.log('🔧 Aplicando políticas RLS para permitir acceso a todos los alumnos...\n');

  try {
    // 1. Eliminar políticas existentes
    console.log('🗑️  Eliminando políticas existentes...');
    const { error: dropError } = await supabase.rpc('drop_policy_if_exists', {
      table_name: 'clases_grabadas',
      policy_name: 'Alumnos pueden ver clases de sus cursos'
    });

    if (dropError) {
      console.log('ℹ️  Política no existía o ya fue eliminada');
    }

    // 2. Crear nueva política simple
    console.log('📝 Creando nueva política para alumnos...');
    const { error: createError } = await supabase.rpc('create_policy', {
      policy_name: 'Todos los alumnos pueden ver clases de sus cursos',
      table_name: 'clases_grabadas',
      operation: 'SELECT',
      condition: `EXISTS (
        SELECT 1 FROM cursos_alumnos
        WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id
        AND cursos_alumnos.user_id = auth.uid()
      )`
    });

    if (createError) {
      console.error('❌ Error creando política:', createError.message);
      
      // Intentar método alternativo usando SQL directo
      console.log('🔄 Intentando método alternativo...');
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS "Alumnos pueden ver clases de sus cursos" ON clases_grabadas;
          CREATE POLICY "Todos los alumnos pueden ver clases de sus cursos" ON clases_grabadas
            FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM cursos_alumnos
                WHERE cursos_alumnos.curso_id = clases_grabadas.curso_id
                AND cursos_alumnos.user_id = auth.uid()
              )
            );
        `
      });

      if (sqlError) {
        console.error('❌ Error con método alternativo:', sqlError.message);
        return;
      }
    }

    console.log('✅ Políticas RLS actualizadas correctamente');
    console.log('📋 Nueva política: Cualquier alumno inscrito en el curso puede ver las clases grabadas');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar la función
fixRLSPolicies();