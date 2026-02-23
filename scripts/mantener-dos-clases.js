const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function mantenerSoloDosClasesPorCurso() {
  console.log('🔧 INICIANDO MANTENIMIENTO: Mantener solo 2 clases por curso');
  
  try {
    // 1. Obtener todos los cursos que tienen clases grabadas
    console.log('📋 Buscando cursos con clases grabadas...');
    
    // Primero obtener todas las clases activas y luego agrupar por curso_id
    const { data: todasClases, error: errorClases } = await supabase
      .from('clases_grabadas')
      .select('curso_id')
      .eq('activo', true);
    
    if (errorClases) {
      console.error('❌ Error al buscar clases:', errorClases);
      return;
    }
    
    // Agrupar manualmente por curso_id
    const cursosUnicos = {};
    todasClases?.forEach(clase => {
      cursosUnicos[clase.curso_id] = true;
    });
    
    const cursosConClases = Object.keys(cursosUnicos).map(curso_id => ({ curso_id }));
    
    console.log(`📊 Encontrados ${cursosConClases?.length || 0} cursos con clases activas`);
    
    if (!cursosConClases || cursosConClases.length === 0) {
      console.log('✅ No hay cursos con clases activas. Nada que hacer.');
      return;
    }
    
    // 2. Para cada curso, verificar y mantener solo 2 clases
    for (const curso of cursosConClases) {
      const cursoId = curso.curso_id;
      console.log(`\n📚 Procesando curso: ${cursoId}`);
      
      // Obtener todas las clases activas de este curso, ordenadas por fecha (más reciente primero)
      const { data: clases, error: errorClases } = await supabase
        .from('clases_grabadas')
        .select('*')
        .eq('curso_id', cursoId)
        .eq('activo', true)
        .order('fecha_clase', { ascending: false });
      
      if (errorClases) {
        console.error(`❌ Error al obtener clases del curso ${cursoId}:`, errorClases);
        continue;
      }
      
      console.log(`   📹 Clases activas encontradas: ${clases?.length || 0}`);
      
      if (!clases || clases.length <= 2) {
        console.log(`   ✅ Curso ${cursoId} tiene ${clases?.length || 0} clases - OK`);
        continue;
      }
      
      // Si hay más de 2 clases, mantener solo las 2 más recientes
      console.log(`   ⚠️  Curso ${cursoId} tiene ${clases.length} clases (más de 2 permitidas)`);
      
      // Las 2 más recientes (primeros elementos del array ordenado descendente)
      const clasesAMantener = clases.slice(0, 2);
      
      // Las clases a desactivar (todas las demás)
      const clasesADesactivar = clases.slice(2);
      
      console.log(`   💾 Manteniendo 2 clases más recientes:`);
      clasesAMantener.forEach((clase, index) => {
        console.log(`     ${index + 1}. ${clase.titulo} (${clase.fecha_clase})`);
      });
      
      console.log(`   🗑️  Desactivando ${clasesADesactivar.length} clases más antiguas:`);
      clasesADesactivar.forEach((clase, index) => {
        console.log(`     ${index + 1}. ${clase.titulo} (${clase.fecha_clase})`);
      });
      
      // Desactivar las clases antiguas
      const idsADesactivar = clasesADesactivar.map(c => c.id);
      
      const { error: errorUpdate } = await supabase
        .from('clases_grabadas')
        .update({ activo: false })
        .in('id', idsADesactivar);
      
      if (errorUpdate) {
        console.error(`❌ Error al desactivar clases del curso ${cursoId}:`, errorUpdate);
      } else {
        console.log(`   ✅ ${clasesADesactivar.length} clases desactivadas correctamente`);
      }
    }
    
    console.log('\n✅ MANTENIMIENTO COMPLETADO: Todos los cursos tienen máximo 2 clases activas');
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar la función
mantenerSoloDosClasesPorCurso();