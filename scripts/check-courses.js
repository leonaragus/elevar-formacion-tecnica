const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkCourses() {
  console.log('--- CHECKING COURSES ---');
  
  const { data: cursos, error } = await supabase
    .from('cursos')
    .select('id, titulo');
    
  if (error) {
      console.error('Error fetching courses:', error);
  } else {
      console.log(`Found ${cursos.length} courses:`);
      cursos.forEach(c => {
          console.log(` - ID: "${c.id}" | Título: "${c.titulo}" | Visible: ${c.visible} | Activo: ${c.activo}`);
      });
  }
}

checkCourses();
