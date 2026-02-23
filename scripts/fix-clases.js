const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixClases() {
  console.log('--- REPARACIÓN DE CLASES GRABADAS ---');

  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  
  // 1. Verificar clases existentes para este curso
  const { data: clases, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId);

  if (error) {
    console.error('Error al leer clases:', error);
    return;
  }

  console.log(`Encontradas ${clases.length} clases para el curso "${cursoId}"`);

  // 2. Activar todas las clases y limpiar curso_id
  for (const clase of clases) {
    console.log(`Procesando clase: ${clase.titulo} (${clase.id})`);
    
    const updates = {
      activo: true, // Forzar activo
      curso_id: cursoId.trim() // Asegurar sin espacios
    };

    const { error: updateError } = await supabase
      .from('clases_grabadas')
      .update(updates)
      .eq('id', clase.id);

    if (updateError) {
      console.error(`  Error al actualizar clase ${clase.id}:`, updateError);
    } else {
      console.log(`  ✅ Clase actualizada: Activo=TRUE, CursoID limpio.`);
    }
  }

  // 3. Verificar nuevamente con la query exacta de la app
  const { data: check, error: checkError } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true);

  console.log(`\nVerificación final (Query exacta de la app):`);
  console.log(`Clases retornadas: ${check?.length || 0}`);
  
  if (checkError) console.error('Error en query de verificación:', checkError);
}

fixClases();
