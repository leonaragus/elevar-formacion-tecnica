const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function simulateAppFetch() {
  console.log('--- SIMULACIÓN EXACTA DEL FETCH DE LA APP ---');
  
  const userId = 'ba98672f-de13-451b-b7f4-de0149b98fdd';
  const cursoId = 'gestion-documental-para-empresas-de-gas-y-petroleo';
  
  // 1. EXACTAMENTE la misma query que usa la app en mis-clases/page.tsx
  console.log('\n1. Ejecutando query EXACTA de la app:');
  console.log('   FROM: clases_grabadas');
  console.log('   WHERE: curso_id = "' + cursoId + '"');
  console.log('   AND: activo = true');
  console.log('   ORDER: fecha_clase DESC');
  
  const { data: clases, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('fecha_clase', { ascending: false });
  
  console.log('\nResultado de la query:');
  console.log('Error:', error);
  console.log('Clases encontradas:', clases?.length || 0);
  
  if (clases && clases.length > 0) {
    console.log('\nDetalles de las clases:');
    clases.forEach((clase, index) => {
      console.log(`\n${index + 1}. ${clase.titulo}`);
      console.log(`   ID: ${clase.id}`);
      console.log(`   Activo: ${clase.activo}`);
      console.log(`   Fecha: ${clase.fecha_clase}`);
      console.log(`   Video path: ${clase.video_path}`);
    });
  } else {
    console.log('\n⚠️  NO SE ENCONTRARON CLASES. Investigando por qué...');
    
    // 2. Verificar si hay clases pero con activo = false
    console.log('\n2. Verificando clases INACTIVAS:');
    const { data: inactiveClases } = await supabase
      .from('clases_grabadas')
      .select('id, titulo, activo, curso_id')
      .eq('curso_id', cursoId)
      .eq('activo', false);
    
    console.log('Clases inactivas encontradas:', inactiveClases?.length || 0);
    if (inactiveClases && inactiveClases.length > 0) {
      inactiveClases.forEach(clase => {
        console.log(`   - ${clase.titulo} (ID: ${clase.id}) - ACTIVO: ${clase.activo}`);
      });
    }
    
    // 3. Verificar si hay clases pero con curso_id diferente
    console.log('\n3. Verificando TODAS las clases para este curso:');
    const { data: allClases } = await supabase
      .from('clases_grabadas')
      .select('id, titulo, activo, curso_id')
      .eq('curso_id', cursoId);
    
    console.log('Total de clases para este curso:', allClases?.length || 0);
    if (allClases && allClases.length > 0) {
      allClases.forEach(clase => {
        console.log(`   - [${clase.activo ? '✅' : '❌'}] ${clase.titulo} (ID: ${clase.id})`);
      });
    }
    
    // 4. Verificar si el curso_id tiene espacios o caracteres especiales
    console.log('\n4. Verificando formato del curso_id:');
    console.log('   Curso ID proporcionado:', `'${cursoId}'`);
    console.log('   Longitud:', cursoId.length);
    console.log('   Bytes:', Buffer.from(cursoId));
    
    // 5. Verificar si hay clases con curso_id similar pero no exacto
    console.log('\n5. Buscando clases con curso_id similar:');
    const { data: similarClases } = await supabase
      .from('clases_grabadas')
      .select('id, titulo, activo, curso_id')
      .ilike('curso_id', `%${cursoId}%`);
    
    console.log('Clases con curso_id similar:', similarClases?.length || 0);
    if (similarClases && similarClases.length > 0) {
      similarClases.forEach(clase => {
        console.log(`   - ${clase.titulo} (Curso ID: '${clase.curso_id}')`);
      });
    }
  }
}

simulateAppFetch();