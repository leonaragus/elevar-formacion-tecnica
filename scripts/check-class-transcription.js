const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkClassTranscription() {
  console.log('--- Checking Latest Class Transcription ---');

  const { data: clases, error } = await supabase
    .from('clases_grabadas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching class:', error);
    return;
  }

  if (clases && clases.length > 0) {
    const clase = clases[0];
    console.log(`Latest Class ID: ${clase.id}`);
    console.log(`Title: ${clase.titulo}`);
    console.log(`Has Transcription Flag: ${clase.tiene_transcripcion}`);
    console.log(`Text Length: ${clase.transcripcion_texto ? clase.transcripcion_texto.length : 0}`);
    console.log(`SRT Length: ${clase.transcripcion_srt ? clase.transcripcion_srt.length : 0}`);
    
    if (clase.transcripcion_texto) {
      console.log('Text Start:', clase.transcripcion_texto.substring(0, 100));
    }
    if (clase.transcripcion_srt) {
      console.log('SRT Start:', clase.transcripcion_srt.substring(0, 100));
    }
  } else {
    console.log('No classes found.');
  }
}

checkClassTranscription();
