const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRecent() {
  console.log('--- CHECKING RECENT ACTIVITY (LAST 1 HOUR) ---');
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // 1. Cursos Alumnos
  const { data: ca, error: caError } = await supabase
    .from('cursos_alumnos')
    .select('*')
    .gt('created_at', oneHourAgo);
    
  if (caError) console.error('Error fetching cursos_alumnos:', caError);
  else {
    console.log(`Found ${ca.length} records in cursos_alumnos:`);
    console.log(JSON.stringify(ca, null, 2));
  }

  // 2. Intereses
  const { data: int, error: intError } = await supabase
    .from('intereses')
    .select('*')
    .gt('created_at', oneHourAgo);

  if (intError) console.error('Error fetching intereses:', intError);
  else {
    console.log(`Found ${int.length} records in intereses:`);
    console.log(JSON.stringify(int, null, 2));
  }

  // 3. Profiles (sometimes updated on login)
  const { data: prof, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .gt('updated_at', oneHourAgo); // Assuming there is an updated_at or created_at

  if (profError) {
      // Try created_at if updated_at fails
      const { data: prof2 } = await supabase.from('profiles').select('*').gt('created_at', oneHourAgo);
      if (prof2) {
          console.log(`Found ${prof2.length} new profiles:`);
          console.log(JSON.stringify(prof2, null, 2));
      }
  } else {
    console.log(`Found ${prof.length} updated profiles:`);
    console.log(JSON.stringify(prof, null, 2));
  }
}

checkRecent();
