const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectEnrollment() {
  console.log('--- INSPECCIÓN DETALLADA DE INSCRIPCIÓN ---');
  
  // User ID obtenido de logs anteriores
  const userId = 'ba98672f-de13-451b-b7f4-de0149b98fdd'; 
  
  console.log(`Buscando inscripciones para user: ${userId}`);

  const { data: inscripciones, error } = await supabase
    .from('cursos_alumnos')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Encontradas: ${inscripciones.length}`);
  
  for (const insc of inscripciones) {
    console.log(`\nInscripción ID: ${insc.id}`);
    console.log(`Estado: ${insc.estado}`);
    console.log(`Curso ID (Raw): '${insc.curso_id}'`);
    console.log(`Curso ID (Bytes):`, Buffer.from(insc.curso_id));
    
    // Verificar si coincide con el esperado
    const expected = 'gestion-documental-para-empresas-de-gas-y-petroleo';
    if (insc.curso_id === expected) {
      console.log('✅ Coincide exactamente con el ID esperado.');
    } else {
      console.log('❌ NO COINCIDE con el ID esperado.');
      console.log(`Expected: '${expected}'`);
      console.log(`Actual  : '${insc.curso_id}'`);
      
      // Intentar arreglar si es necesario
      if (insc.curso_id.trim() === expected) {
          console.log('⚠️ Tiene espacios extra. Corrigiendo...');
          await supabase.from('cursos_alumnos').update({ curso_id: expected }).eq('id', insc.id);
          console.log('✅ Corregido.');
      }
    }
  }

  // Verificar tabla cursos también
  console.log('\n--- VERIFICANDO TABLA CURSOS ---');
  const { data: cursos } = await supabase.from('cursos').select('id, titulo');
  cursos.forEach(c => {
      if (c.id.includes('gestion-documental')) {
          console.log(`Curso: '${c.id}' - '${c.titulo}'`);
      }
  });
}

inspectEnrollment();
