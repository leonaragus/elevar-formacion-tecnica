const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTypes() {
  console.log('--- CHECKING COLUMN TYPES ---');
  
  // No podemos consultar information_schema directamente con supabase-js facilmente sin SQL function
  // Pero podemos intentar insertar un string en curso_id y ver si falla con error de tipo
  
  const testId = 'test-string-id-' + Date.now();
  
  console.log('Intento 1: Insertar en cursos_alumnos con curso_id TEXTO');
  const { error: errText } = await supabase
    .from('cursos_alumnos')
    .insert({
        user_id: 'e9d67404-bad2-4b07-a39b-b6904b0c2fba', // ID de demo.alumno existente
        curso_id: testId,
        estado: 'test'
    });
    
  if (errText) {
      console.log('❌ Error insertando TEXTO:', errText.message);
      if (errText.message.includes('uuid')) {
          console.log('   -> CONFIRMADO: curso_id espera UUID');
      }
  } else {
      console.log('✅ Éxito insertando TEXTO -> curso_id es TEXT (o compatible)');
      // Limpiar
      await supabase.from('cursos_alumnos').delete().eq('curso_id', testId);
  }
}

checkTypes();
