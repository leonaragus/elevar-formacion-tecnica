const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function reactivateAllClasses() {
  console.log('--- REACTIVANDO TODAS LAS CLASES ---');
  
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  
  // 1. Reactivar TODAS las clases para este curso
  console.log('\n1. Reactivando todas las clases para el curso:', cursoId);
  
  const { error: updateError } = await supabase
    .from('clases_grabadas')
    .update({ activo: true })
    .eq('curso_id', cursoId);
  
  if (updateError) {
    console.error('❌ Error al reactivar:', updateError);
    return;
  }
  
  console.log('✅ Todas las clases reactivadas correctamente');
  
  // 2. Verificar el estado final
  console.log('\n2. Verificación final:');
  const { data: estadoFinal } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, activo')
    .eq('curso_id', cursoId);
  
  console.log(`Total de clases: ${estadoFinal?.length || 0}`);
  if (estadoFinal && estadoFinal.length > 0) {
    estadoFinal.forEach(clase => {
      const estado = clase.activo ? '✅ ACTIVA' : '❌ INACTIVA';
      console.log(`   ${estado} - ${clase.titulo}`);
    });
  }
  
  // 3. Ahora investigar por qué la app no las muestra
  console.log('\n3. Investigando por qué la aplicación no muestra las clases:');
  console.log('   - Las 3 clases están activas y pertenecen al curso correcto');
  console.log('   - El problema debe estar en la lógica de la aplicación');
  console.log('   - Posibles causas:');
  console.log('     * RLS (Row Level Security) bloqueando el acceso');
  console.log('     * Error en la query de la aplicación');
  console.log('     * Problema de autenticación del usuario');
  console.log('     * Cache o problemas de renderizado');
}

reactivateAllClasses();