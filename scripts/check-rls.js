const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgmauuzwzsoaytsulgwg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkPolicies() {
  console.log('--- CHECKING RLS POLICIES ---');
  
  // We can't query pg_policies directly easily via JS client without a function
  // But we can test INSERT with a normal user client (ANON key + Login)
  
  // 1. Create a user client (simulating the student)
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTYxOTUsImV4cCI6MjA4NTA5MjE5NX0.4uASiQ4dpPvU0ylcKzv9wd0XVoSREnjwKGwtQbvhV3Q';
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  
  // Login with the demo user we know exists
  const { data: { session }, error: loginError } = await userClient.auth.signInWithPassword({
    email: 'test_flow_user_v2@example.com', // Ops, I deleted this user. Let's create a temp one or use existing
    password: 'password123'
  });
  
  // Wait, I deleted the test user. I need to create one first to test RLS.
  console.log('Creating temp user for RLS test...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'rls_test_user@example.com',
    password: 'password123',
    email_confirm: true
  });
  
  if (createError) {
      console.error('Error creating temp user:', createError);
      return;
  }
  
  const userId = newUser.user.id;
  
  // Now login as this user
  const { data: loginData, error: loginErr } = await userClient.auth.signInWithPassword({
    email: 'rls_test_user@example.com',
    password: 'password123'
  });
  
  if (loginErr) {
      console.error('Error logging in as temp user:', loginErr);
      // Cleanup
      await supabase.auth.admin.deleteUser(userId);
      return;
  }
  
  console.log('Logged in as temp user. Testing INSERT into cursos_alumnos...');
  
  const { error: insertError } = await userClient
    .from('cursos_alumnos')
    .insert({
        user_id: userId,
        curso_id: 'gestion-documental-para-empresas-de-gas-y-petroleo',
        estado: 'pendiente'
    });
    
  if (insertError) {
      console.log('❌ INSERT Failed (RLS likely blocks it):', insertError);
  } else {
      console.log('✅ INSERT Success (RLS allows it)');
  }
  
  // Cleanup
  console.log('Cleaning up...');
  await supabase.auth.admin.deleteUser(userId);
}

checkPolicies();
