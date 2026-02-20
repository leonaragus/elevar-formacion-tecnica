const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('clases_grabadas').select('*').then(r => {
  console.log('RESULTADO:', JSON.stringify(r, null, 2));
  process.exit(0);
});
