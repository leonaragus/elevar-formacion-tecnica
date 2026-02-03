
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data, error } = await supabase.from('legajos').select('*').limit(1);
  if (error) {
    console.error('Error selecting * from legajos:', error.message);
  } else {
    console.log('Legajos Columns:', data.length > 0 ? Object.keys(data[0]) : 'No rows in legajos');
  }
}

check();
