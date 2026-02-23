const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectAllClasses() {
  console.log('🔍 INSPECCIÓN COMPLETA DE CLASES GRABADAS');
  
  // 1. Obtener TODAS las clases
  const { data: todasClases, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📊 TOTAL DE CLASES ENCONTRADAS: ${todasClases.length}`);
  
  // 2. Agrupar por curso_id
  const clasesPorCurso = {};
  todasClases.forEach(clase => {
    if (!clasesPorCurso[clase.curso_id]) {
      clasesPorCurso[clase.curso_id] = [];
    }
    clasesPorCurso[clase.curso_id].push(clase);
  });
  
  console.log('\n📋 DISTRIBUCIÓN POR CURSO:');
  Object.keys(clasesPorCurso).forEach(cursoId => {
    const clases = clasesPorCurso[cursoId];
    const activas = clases.filter(c => c.activo).length;
    console.log(`   - '${cursoId}': ${clases.length} clases (${activas} activas)`);
  });
  
  // 3. Mostrar detalle completo de cada clase
  console.log('\n🔎 DETALLE DE CADA CLASE:');
  todasClases.forEach((clase, index) => {
    console.log(`\n${index + 1}. ${clase.titulo}`);
    console.log(`   ID: ${clase.id}`);
    console.log(`   Curso: '${clase.curso_id}'`);
    console.log(`   Activo: ${clase.activo}`);
    console.log(`   Creado: ${clase.created_at}`);
    console.log(`   Video: ${clase.video_path}`);
  });
  
  // 4. Identificar clases que deben eliminarse
  console.log('\n🗑️  CLASES QUE DEBEN ELIMINARSE (cursos no existentes):');
  const cursoCorrecto = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  const clasesAEliminar = todasClases.filter(clase => 
    clase.curso_id !== cursoCorrecto
  );
  
  if (clasesAEliminar.length === 0) {
    console.log('   ✅ No hay clases de cursos incorrectos');
  } else {
    console.log(`   Se encontraron ${clasesAEliminar.length} clases de cursos incorrectos:`);
    clasesAEliminar.forEach(clase => {
      console.log(`   - ${clase.titulo} (Curso: '${clase.curso_id}')`);
    });
    
    // 5. Preguntar sobre eliminación
    console.log('\n⚠️  Estas clases parecen ser de cursos antiguos que ya no existen.');
    console.log('   ¿Deseas eliminarlas? (ejecutar cleanup manualmente)');
  }
  
  // 6. Verificar clases del curso correcto
  console.log('\n✅ CLASES DEL CURSO CORRECTO:');
  const clasesCorrectas = todasClases.filter(clase => 
    clase.curso_id === cursoCorrecto
  );
  
  if (clasesCorrectas.length === 0) {
    console.log('   ❌ No hay clases para el curso correcto');
  } else {
    console.log(`   Encontradas ${clasesCorrectas.length} clases:`);
    clasesCorrectas.forEach(clase => {
      const estado = clase.activo ? '✅ ACTIVA' : '❌ INACTIVA';
      console.log(`   ${estado} - ${clase.titulo}`);
    });
    
    // Verificar si hay más de una activa
    const activas = clasesCorrectas.filter(c => c.activo);
    if (activas.length > 1) {
      console.log(`\n⚠️  HAY ${activas.length} CLASES ACTIVAS - Debe haber solo 1`);
      console.log('   Se necesita desactivar las adicionales');
    }
  }
}

inspectAllClasses();