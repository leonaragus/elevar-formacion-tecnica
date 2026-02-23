const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function debugCursoIdMismatch() {
  console.log('--- DEBUG: VERIFICANDO MISMATCH DE CURSO_ID ---');
  
  const userId = 'ba98672f-de13-451b-b7f4-de0149b98fdd';
  
  // 1. Verificar qué curso_id tiene el usuario en su inscripción
  console.log('\n1. Verificando inscripción del usuario:');
  const { data: inscripciones } = await supabase
    .from('cursos_alumnos')
    .select('curso_id, estado')
    .eq('user_id', userId)
    .eq('estado', 'activo');
  
  console.log('Inscripciones activas encontradas:', inscripciones?.length || 0);
  if (inscripciones && inscripciones.length > 0) {
    inscripciones.forEach(insc => {
      console.log(`   - Curso ID: '${insc.curso_id}'`);
      console.log(`     Longitud: ${insc.curso_id.length}`);
      console.log(`     Bytes:`, Buffer.from(insc.curso_id));
    });
  }
  
  // 2. Verificar TODOS los cursos disponibles
  console.log('\n2. Verificando todos los cursos en la base:');
  const { data: todosLosCursos } = await supabase
    .from('cursos')
    .select('id, titulo')
    .order('titulo');
  
  console.log('Total de cursos:', todosLosCursos?.length || 0);
  if (todosLosCursos && todosLosCursos.length > 0) {
    todosLosCursos.forEach(curso => {
      console.log(`   - '${curso.id}' -> ${curso.titulo}`);
    });
  }
  
  // 3. Verificar si hay discrepancias en el curso_id
  console.log('\n3. Buscando posibles discrepancias:');
  
  // El curso que sabemos que tiene clases
  const cursoConClases = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  console.log(`   Curso con clases: '${cursoConClases}'`);
  
  // Verificar si el usuario está inscrito en ESTE curso específico
  if (inscripciones && inscripciones.length > 0) {
    const estaInscrito = inscripciones.some(insc => insc.curso_id === cursoConClases);
    console.log(`   ¿Está inscrito en el curso con clases? ${estaInscrito ? '✅ SÍ' : '❌ NO'}`);
    
    if (!estaInscrito) {
      console.log('\n⚠️  PROBLEMA ENCONTRADO: El usuario NO está inscrito en el curso que tiene clases.');
      console.log('   Esto explica por qué no ve las clases grabadas.');
      
      // Verificar en qué curso SÍ está inscrito
      console.log('\n4. El usuario está inscrito en estos cursos:');
      inscripciones.forEach(insc => {
        // Buscar el título del curso
        const curso = todosLosCursos?.find(c => c.id === insc.curso_id);
        console.log(`   - '${insc.curso_id}' -> ${curso?.titulo || 'Título no encontrado'}`);
      });
    }
  }
}

debugCursoIdMismatch();