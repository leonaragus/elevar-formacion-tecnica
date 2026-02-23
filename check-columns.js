
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Checking columns for table "cursos"...');
  
  // We can't directly query information_schema easily with supabase-js unless we have a function for it or raw sql access.
  // But we can try to select a single row and see what columns are returned, OR try to insert a dummy row and catch the error.
  
  // Method 1: Get one row
  const { data, error } = await supabase.from('cursos').select('*').limit(1);
  
  if (error) {
    console.error('Error selecting from cursos:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found in first row:', Object.keys(data[0]));
  } else {
    console.log('No rows found in cursos table. Can\'t infer columns from data.');
  }

  // Method 2: Check for specific column 'duracion' by selecting it
  const columnsToCheck = ['duracion', 'nivel', 'imagen', 'profesor', 'meses'];
  
  for (const col of columnsToCheck) {
    const { data: d2, error: e2 } = await supabase.from('cursos').select(col).limit(1);
    if (e2) {
      console.error(`Error selecting "${col}":`, e2.message);
    } else {
      console.log(`Successfully selected "${col}" column.`);
    }
  }
}

checkColumns();
