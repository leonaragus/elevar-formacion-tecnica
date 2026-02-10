const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
    console.error("No .env.local found");
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log("Searching for test users...");
  
  // 1. Delete Auth Users
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
      console.error("Error listing users:", error);
  } else {
      const targets = users.filter(u => {
          const email = (u.email || "").toLowerCase();
          const name = (u.user_metadata?.nombre || "").toLowerCase();
          return email.includes("prueba") || email.includes("test") || name.includes("prueba") || name.includes("test");
      });

      console.log(`Found ${targets.length} auth users to delete.`);
      
      for (const t of targets) {
          console.log(`Deleting Auth User: ${t.email} (${t.id})`);
          const { error: delErr } = await supabase.auth.admin.deleteUser(t.id);
          if (delErr) console.error(`Failed: ${delErr.message}`);
          else console.log("Deleted.");
      }
  }

  // 2. Delete from 'intereses'
  const { data: intereses, error: errInt } = await supabase.from("intereses").select("email");
  if (errInt) {
      console.error("Error listing intereses:", errInt);
  } else {
      const targets = intereses.filter(i => {
          const email = (i.email || "").toLowerCase();
          return email.includes("prueba") || email.includes("test");
      });
      
      console.log(`Found ${targets.length} interests to delete.`);
      
      for (const t of targets) {
          console.log(`Deleting Interes: ${t.email}`);
          const { error: delErr } = await supabase.from("intereses").delete().eq("email", t.email);
          if (delErr) console.error(`Failed: ${delErr.message}`);
          else console.log("Deleted.");
      }
  }
}

main();
