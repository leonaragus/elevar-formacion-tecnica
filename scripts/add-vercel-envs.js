const { execSync } = require('child_process');

const envs = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://rgmauuzwzsoaytsulgwg.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTYxOTUsImV4cCI6MjA4NTA5MjE5NX0.4uASiQ4dpPvU0ylcKzv9wd0XVoSREnjwKGwtQbvhV3Q',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbWF1dXp3enNvYXl0c3VsZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxNjE5NSwiZXhwIjoyMDg1MDkyMTk1fQ.JsjmpLw9YjV4fePuwnmBM8ARM84PFJck_Nfr4yjvICA',
  ADMIN_TOKEN: 'admin-test-token-12345',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'BHy9d1h8CN1k4F1uq_ekLiBn7Xg6SKnwA4W08ZdcGYLQPJ4K0Sm_RQBLjVwMWWF1ihkM7HF_E_6zTknhtViBtBo',
  VAPID_PRIVATE_KEY: 'tKWeLoHbM_ZyInYcsgTJV_9ulU1owGNtR3tSsCtXjhU',
  VAPID_SUBJECT: 'mailto:admin@tuinstituto.com',
  CRON_API_KEY: 'mi_clave_secreta_super_segura_12345'
};

const targets = ['production', 'preview', 'development'];

for (const [key, value] of Object.entries(envs)) {
  console.log(`Adding ${key}...`);
  try {
    // Try to remove it first to avoid duplicates/errors if it exists
    try {
      execSync(`npx vercel env rm ${key} -y`);
    } catch (e) {
      // Ignore error if it doesn't exist
    }

    // Add it to all targets
    // vercel env add <name> [environment] < <file> or echo
    // The syntax is: echo value | vercel env add NAME target
    
    // We will loop through targets because 'vercel env add' usually asks for targets interactively
    // but if we specify the target in the command line args? 
    // Actually 'vercel env add' syntax is: vercel env add [name] [environment]
    // If environment is provided, it might skip the prompt.
    
    execSync(`echo "${value}" | npx vercel env add ${key} production`);
    execSync(`echo "${value}" | npx vercel env add ${key} preview`);
    execSync(`echo "${value}" | npx vercel env add ${key} development`);
    
    console.log(`✅ ${key} added.`);
  } catch (error) {
    console.error(`❌ Failed to add ${key}:`, error.message);
  }
}
