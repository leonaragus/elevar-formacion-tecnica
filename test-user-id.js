const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = 'ba98672f-de13-451b-b7f4-de0149b98fdd';

async function test() {
  const { data: profile } = await s.from('profiles').select('*').eq('id', userId).maybeSingle();
  console.log('PROFILE:', profile);
  
  const { data: { user } } = await s.auth.admin.getUserById(userId);
  console.log('AUTH USER:', user?.email);
}

test();
