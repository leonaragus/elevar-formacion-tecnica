const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkCurrentState() {
  console.log('--- ESTADO ACTUAL DE LAS CLASES ---');
  
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  
  // 1. Verificar todas las clases para este curso
  console.log('\n1. Todas las clases para el curso:', cursoId);
  const { data: todasClases, error } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, activo, created_at')
    .eq('curso_id', cursoId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total de clases: ${todasClases.length}`);
  
  if (todasClases.length === 0) {
    console.log('❌ No hay clases para este curso');
    return;
  }
  
  // 2. Mostrar detalle de cada clase
  todasClases.forEach((clase, index) => {
    const estado = clase.activo ? '✅ ACTIVA' : '❌ INACTIVA';
    console.log(`${index + 1}. ${estado} - ${clase.titulo} (ID: ${clase.id})`);
    console.log(`   Creada: ${clase.created_at}`);
  });
  
  // 3. Contar clases activas
  const clasesActivas = todasClases.filter(c => c.activo);
  console.log(`\n2. Clases activas: ${clasesActivas.length}`);
  
  if (clasesActivas.length > 1) {
    console.log('⚠️  PROBLEMA: Hay más de una clase activa');
    console.log('   Esto puede causar que la app no muestre las clases correctamente');
    
    // 4. Si hay más de una activa, corregirlo
    console.log('\n3. Corrigiendo: dejando solo la clase más reciente activa...');
    
    // Ordenar por fecha (la más reciente primero)
    const clasesOrdenadas = [...todasClases].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    const claseMasReciente = clasesOrdenadas[0];
    const clasesADesactivar = clasesOrdenadas.slice(1).filter(c => c.activo);
    
    if (clasesADesactivar.length > 0) {
      console.log(`   Manteniendo activa: ${claseMasReciente.titulo}`);
      console.log(`   Desactivando: ${clasesADesactivar.length} clases`);
      
      const idsADesactivar = clasesADesactivar.map(c => c.id);
      const { error: updateError } = await supabase
        .from('clases_grabadas')
        .update({ activo: false })
        .in('id', idsADesactivar);
      
      if (updateError) {
        console.error('❌ Error al desactivar:', updateError);
      } else {
        console.log('✅ Clases desactivadas correctamente');
      }
    }
  } else if (clasesActivas.length === 1) {
    console.log('✅ Estado correcto: solo una clase activa');
  } else {
    console.log('❌ No hay clases activas');
    
    // Activar la clase más reciente
    const claseMasReciente = todasClases[0];
    console.log(`\n4. Activando la clase más reciente: ${claseMasReciente.titulo}`);
    
    const { error: activateError } = await supabase
      .from('clases_grabadas')
      .update({ activo: true })
      .eq('id', claseMasReciente.id);
    
    if (activateError) {
      console.error('❌ Error al activar:', activateError);
    } else {
      console.log('✅ Clase activada correctamente');
    }
  }
  
  // 5. Verificación final
  console.log('\n5. Verificación final:');
  const { data: estadoFinal } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, activo')
    .eq('curso_id', cursoId)
    .eq('activo', true);
  
  console.log(`Clases activas: ${estadoFinal?.length || 0}`);
  if (estadoFinal && estadoFinal.length > 0) {
    estadoFinal.forEach(clase => {
      console.log(`   ✅ ${clase.titulo}`);
    });
  }
}

checkCurrentState();