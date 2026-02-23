const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUrgent() {
  console.log('--- CHECK URGENTE DE INSCRIPCIONES ---');

  // 1. Ver TODOS los usuarios (incluyendo el que acabas de crear/loguear)
  const { data: { users } } = await supabase.auth.admin.listUsers({ 
    perPage: 10, 
    sortBy: { field: 'created_at', order: 'desc'} 
  });
  
  console.log('\nÚltimos usuarios (para identificar el tuyo):');
  users.slice(0, 3).forEach(u => {
      console.log(` - ${u.email} (ID: ${u.id}) - Creado: ${u.created_at}`);
  });

  // 2. Ver si hay CUALQUIER registro en cursos_alumnos para esos usuarios
  if (users.length > 0) {
      const lastUserId = users[0].id;
      console.log(`\nBuscando registros para el último usuario (${users[0].email})...`);
      
      const { data: records } = await supabase
        .from('cursos_alumnos')
        .select('*')
        .eq('user_id', lastUserId);
        
      if (records && records.length > 0) {
          console.log('✅ ENCONTRADO en cursos_alumnos:');
          console.log(records);
      } else {
          console.log('❌ NO encontrado en cursos_alumnos.');
          
          // 3. Si no está en cursos_alumnos, buscar en intereses (fallback)
          const { data: ints } = await supabase
            .from('intereses')
            .select('*')
            .eq('email', users[0].email);
            
          if (ints && ints.length > 0) {
              console.log('⚠️ ENCONTRADO en intereses (pero no en cursos_alumnos):');
              console.log(ints);
          } else {
              console.log('❌ Tampoco encontrado en intereses.');
          }
      }
  }
}

checkUrgent();
