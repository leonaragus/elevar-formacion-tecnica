const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCurrentPolicies() {
  console.log('🔍 Verificando políticas RLS actuales...\n');

  try {
    // 1. Verificar si la tabla tiene RLS habilitado
    console.log('📋 Estado RLS de clases_grabadas:');
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('tablename', 'clases_grabadas');

    if (rlsError) {
      console.log('ℹ️  No se pudo verificar estado RLS, asumiendo que está activo');
    } else {
      console.log('   RLS activo:', rlsStatus[0]?.rowsecurity || 'Sí');
    }

    // 2. Verificar políticas actuales
    console.log('\n📋 Políticas existentes:');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'clases_grabadas');

    if (policiesError) {
      console.error('❌ Error obteniendo políticas:', policiesError.message);
      return;
    }

    if (policies.length === 0) {
      console.log('   No hay políticas definidas - acceso denegado por defecto');
    } else {
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.qual})`);
      });
    }

    // 3. Verificar datos de cursos_alumnos
    console.log('\n👥 Verificando inscripciones de alumnos:');
    const { data: inscripciones, error: inscError } = await supabase
      .from('cursos_alumnos')
      .select('*')
      .limit(5);

    if (inscError) {
      console.error('❌ Error obteniendo inscripciones:', inscError.message);
    } else {
      console.log(`   ${inscripciones.length} inscripciones encontradas`);
      inscripciones.forEach(insc => {
        console.log(`     - Curso: ${insc.curso_id}, Usuario: ${insc.user_id}, Estado: ${insc.estado}`);
      });
    }

    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar la función
checkCurrentPolicies();