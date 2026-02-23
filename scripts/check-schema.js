const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSchema() {
  console.log('--- Checking Last Class SRT ---');
  const { data: classes } = await supabase
    .from('clases_grabadas')
    .select('transcripcion_srt')
    .order('created_at', { ascending: false })
    .limit(1);

  if (classes && classes.length > 0) {
    const srt = classes[0].transcripcion_srt || "";
    console.log('SRT Start (first 500 chars):');
    console.log('--------------------------------------------------');
    console.log(srt.substring(0, 500));
    console.log('--------------------------------------------------');
    console.log('SRT Length:', srt.length);
    // Check for weird characters
    console.log('Contains \\r\\n?', srt.includes('\r\n'));
    console.log('Contains \\n\\n?', srt.includes('\n\n'));
  }

  console.log('\n--- Checking Table Types ---');
  // We can't easily query information_schema via JS client usually, but we can try rpc or just infer from error.
  // Instead, let's try to insert a dummy record with a text ID to cursos_alumnos and see if it fails.
  // actually, we can just use the previous check-pending result which queried it. 
  // If the query worked, the column exists.
  // But we want to know the TYPE.
  
  // Let's try to fetch one record from cursos_alumnos and see the type of curso_id
  const { data: ca } = await supabase.from('cursos_alumnos').select('curso_id').limit(1);
  if (ca && ca.length > 0) {
    console.log('Sample curso_id from cursos_alumnos:', ca[0].curso_id, 'Type:', typeof ca[0].curso_id);
  } else {
    console.log('No records in cursos_alumnos to check type.');
  }
}

checkSchema().catch(e => console.error(e));
