const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function debugClassDeletion() {
  console.log('--- DEBUG: VERIFICANDO POR QUÉ NO SE BORRAN LAS CLASES ---');
  
  // 1. Primero verificar TODAS las clases existentes
  console.log('\n1. Listando TODAS las clases grabadas:');
  const { data: todasClases, error: error1 } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, curso_id, activo, created_at')
    .order('created_at', { ascending: false });
  
  if (error1) {
    console.error('Error al obtener clases:', error1);
    return;
  }
  
  console.log(`Total de clases en DB: ${todasClases.length}`);
  todasClases.forEach((clase, index) => {
    console.log(`${index + 1}. ${clase.titulo} (Curso: '${clase.curso_id}', ID: ${clase.id}, Activo: ${clase.activo})`);
  });
  
  // 2. Identificar clases que deberían ser eliminadas
  const cursoCorrecto = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  const clasesAEliminar = todasClases.filter(clase => 
    clase.curso_id !== cursoCorrecto
  );
  
  console.log(`\n2. Clases que deberían eliminarse: ${clasesAEliminar.length}`);
  
  if (clasesAEliminar.length === 0) {
    console.log('✅ No hay clases incorrectas que eliminar');
    return;
  }
  
  // 3. Intentar eliminar UNA clase primero para ver si hay error
  console.log('\n3. Probando eliminar UNA clase:');
  const primeraClase = clasesAEliminar[0];
  console.log(`   Intentando eliminar: ${primeraClase.titulo} (ID: ${primeraClase.id})`);
  
  const { error: deleteError } = await supabase
    .from('clases_grabadas')
    .delete()
    .eq('id', primeraClase.id);
  
  if (deleteError) {
    console.error('❌ Error al eliminar:', deleteError);
    console.log('\n4. Posibles causas:');
    console.log('   - RLS (Row Level Security) bloqueando la eliminación');
    console.log('   - Permisos insuficientes con SERVICE_ROLE_KEY');
    console.log('   - La tabla tiene triggers que previenen eliminaciones');
    console.log('   - Problemas de conexión con Supabase');
    
    // 5. Verificar políticas RLS
    console.log('\n5. Verificando políticas RLS:');
    try {
      const { data: policies } = await supabase
        .from('pg_policies')
        .select('*')
        .ilike('tablename', 'clases_grabadas');
      
      console.log('Políticas RLS encontradas:', policies?.length || 0);
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.qual})`);
        });
      }
    } catch (rlserror) {
      console.log('No se pudieron verificar políticas RLS (normal):', rlserror.message);
    }
    
  } else {
    console.log('✅ Clase eliminada correctamente');
    
    // 6. Si se pudo eliminar una, eliminar todas
    console.log('\n6. Eliminando todas las clases incorrectas...');
    const idsRestantes = clasesAEliminar.slice(1).map(c => c.id);
    
    if (idsRestantes.length > 0) {
      const { error: bulkError } = await supabase
        .from('clases_grabadas')
        .delete()
        .in('id', idsRestantes);
      
      if (bulkError) {
        console.error('Error al eliminar en bulk:', bulkError);
      } else {
        console.log(`✅ ${idsRestantes.length} clases eliminadas correctamente`);
      }
    }
  }
  
  // 7. Verificación final
  console.log('\n7. Estado final:');
  const { data: estadoFinal } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, curso_id, activo');
  
  console.log(`Clases restantes: ${estadoFinal?.length || 0}`);
  if (estadoFinal && estadoFinal.length > 0) {
    estadoFinal.forEach(clase => {
      console.log(`   - ${clase.titulo} (Curso: '${clase.curso_id}')`);
    });
  }
}

debugClassDeletion();