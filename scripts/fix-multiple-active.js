const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixMultipleActiveClasses() {
  console.log('--- CORRIGIENDO MÚLTIPLES CLASES ACTIVAS ---');
  
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  
  // 1. Obtener todas las clases activas para este curso
  console.log('\n1. Buscando clases activas para el curso:', cursoId);
  const { data: clasesActivas, error } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, activo, created_at')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Clases activas encontradas: ${clasesActivas.length}`);
  
  if (clasesActivas.length <= 1) {
    console.log('✅ Solo hay una clase activa. No es necesario hacer cambios.');
    return;
  }
  
  // 2. Mostrar las clases activas
  console.log('\n2. Clases activas encontradas:');
  clasesActivas.forEach((clase, index) => {
    console.log(`${index + 1}. ${clase.titulo} (ID: ${clase.id}, Creada: ${clase.created_at})`);
  });
  
  // 3. Determinar cuál clase mantener activa (la más reciente)
  const claseAMantener = clasesActivas[0]; // La más reciente
  const clasesADesactivar = clasesActivas.slice(1);
  
  console.log(`\n3. Manteniendo activa: ${claseAMantener.titulo}`);
  console.log(`   Desactivando: ${clasesADesactivar.length} clases`);
  
  // 4. Desactivar las clases sobrantes
  if (clasesADesactivar.length > 0) {
    const idsADesactivar = clasesADesactivar.map(c => c.id);
    
    console.log('\n4. Desactivando clases sobrantes...');
    const { error: updateError } = await supabase
      .from('clases_grabadas')
      .update({ activo: false })
      .in('id', idsADesactivar);
    
    if (updateError) {
      console.error('❌ Error al desactivar:', updateError);
      return;
    }
    
    console.log('✅ Clases desactivadas correctamente');
  }
  
  // 5. Verificación final
  console.log('\n5. Verificación final:');
  const { data: estadoFinal } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, activo')
    .eq('curso_id', cursoId)
    .eq('activo', true);
  
  console.log(`Clases activas después de la corrección: ${estadoFinal?.length || 0}`);
  if (estadoFinal && estadoFinal.length > 0) {
    estadoFinal.forEach(clase => {
      console.log(`   ✅ ${clase.titulo}`);
    });
  }
  
  // 6. También mostrar todas las clases (activas e inactivas) para este curso
  console.log('\n6. Estado completo de clases para este curso:');
  const { data: todasLasClases } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, activo')
    .eq('curso_id', cursoId)
    .order('activo', { ascending: false });
  
  if (todasLasClases && todasLasClases.length > 0) {
    todasLasClases.forEach(clase => {
      const estado = clase.activo ? '✅ ACTIVA' : '❌ INACTIVA';
      console.log(`   ${estado} - ${clase.titulo}`);
    });
  }
}

fixMultipleActiveClasses();