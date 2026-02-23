const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function debugAppLogic() {
  console.log('--- INVESTIGANDO POR QUÉ LA APP NO MUESTRA LAS CLASES ---');
  
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  const userId = 'ba98672f-de13-451b-b7f4-de0149b98fdd'; // ID del usuario de prueba
  
  // 1. Simular EXACTAMENTE lo que hace la app en mis-clases/page.tsx
  console.log('\n1. Simulando la query EXACTA de la aplicación:');
  
  const { data: clases, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('fecha_clase', { ascending: false });
  
  console.log('Resultado de la query:');
  console.log('Error:', error);
  console.log('Clases encontradas (con service role):', clases?.length || 0);
  
  if (clases && clases.length > 0) {
    console.log('\nClases que la query encontró:');
    clases.forEach((clase, index) => {
      console.log(`${index + 1}. ${clase.titulo} (ID: ${clase.id})`);
    });
  }
  
  // 2. Ahora simular lo que vería un usuario normal (con RLS)
  console.log('\n2. Probando con un cliente normal (simulando RLS):');
  
  // Crear un cliente sin service role (como lo haría un usuario normal)
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTYxOTUsImV4cCI6MjA4NTA5MjE5NX0.4uASiQ4dpPvU0ylcKzv9wd0XVoSREnjwKGwtQbvhV3Q';
  const anonClient = createClient(SUPABASE_URL, anonKey);
  
  const { data: clasesAnon, error: errorAnon } = await anonClient
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true);
  
  console.log('Clases encontradas (con anon key):', clasesAnon?.length || 0);
  console.log('Error (anon):', errorAnon);
  
  // 3. Verificar si el usuario está inscrito correctamente
  console.log('\n3. Verificando inscripción del usuario:');
  
  const { data: inscripcion } = await supabase
    .from('cursos_alumnos')
    .select('*')
    .eq('user_id', userId)
    .eq('curso_id', cursoId)
    .eq('estado', 'activo')
    .single();
  
  console.log('Inscripción encontrada:', inscripcion ? '✅ SÍ' : '❌ NO');
  if (inscripcion) {
    console.log('   - ID:', inscripcion.id);
    console.log('   - Estado:', inscripcion.estado);
    console.log('   - Fecha creación:', inscripcion.created_at);
  }
  
  // 4. Verificar políticas RLS
  console.log('\n4. Investigando posibles problemas:');
  console.log('   - Con service role: encontramos', clases?.length || 0, 'clases');
  console.log('   - Con anon key: encontramos', clasesAnon?.length || 0, 'clases');
  console.log('   - Usuario inscrito:', inscripcion ? 'SÍ' : 'NO');
  
  if (clases?.length > 0 && clasesAnon?.length === 0) {
    console.log('\n🔍 PROBLEMA IDENTIFICADO: RLS (Row Level Security)');
    console.log('   - Las clases existen en la base de datos');
    console.log('   - Pero las políticas RLS están bloqueando el acceso');
    console.log('   - Esto significa que aunque las clases estén activas,');
    console.log('     los usuarios no pueden verlas por las políticas de seguridad');
  } else if (clases?.length === 0) {
    console.log('\n🔍 PROBLEMA: No hay clases activas encontradas');
  } else if (!inscripcion) {
    console.log('\n🔍 PROBLEMA: El usuario no está inscrito activamente');
  }
}

debugAppLogic();