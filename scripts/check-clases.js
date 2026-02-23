const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkClases() {
  console.log('--- DIAGNÓSTICO DE CLASES GRABADAS ---');

  // 1. Listar Cursos
  const { data: cursos, error: cursosError } = await supabase
    .from('cursos')
    .select('id, titulo');
  
  if (cursosError) {
    console.error('Error al obtener cursos:', cursosError);
    return;
  }
  console.log(`\nCursos encontrados: ${cursos.length}`);
  cursos.forEach(c => console.log(`- [${c.id}] ${c.titulo}`));

  // 2. Listar Clases Grabadas (todas)
  const { data: clases, error: clasesError } = await supabase
    .from('clases_grabadas')
    .select('id, titulo, curso_id, activo, video_path');

  if (clasesError) {
    console.error('Error al obtener clases grabadas:', clasesError);
  } else {
    console.log(`\nClases Grabadas encontradas: ${clases.length}`);
    clases.forEach(c => {
        const curso = cursos.find(cu => cu.id === c.curso_id);
        const cursoNombre = curso ? curso.titulo : 'DESCONOCIDO';
        console.log(`- [${c.id}] "${c.titulo}" (Curso: ${cursoNombre}, ID: ${c.curso_id}) - Activo: ${c.activo}`);
        if (!c.activo) console.log('  ⚠️  CLASE INACTIVA - El alumno no la verá');
    });

    if (clases.length === 0) {
        console.log('\n⚠️  NO HAY CLASES GRABADAS EN EL SISTEMA.');
        console.log('Se debe crear al menos una clase para que el alumno vea algo.');
    }
  }

  // 3. Ver inscripciones recientes (últimas 5)
  const { data: inscripciones } = await supabase
    .from('cursos_alumnos')
    .select('user_id, curso_id, estado, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\nÚltimas 5 inscripciones:');
  if (inscripciones) {
      inscripciones.forEach(i => {
          const curso = cursos.find(c => c.id === i.curso_id);
          console.log(`- User ${i.user_id} en "${curso ? curso.titulo : i.curso_id}" (${i.estado}) - ${i.created_at}`);
      });
  }
}

checkClases();
