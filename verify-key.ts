
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function verify() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log("Checking URL:", url);
  console.log("Checking Key:", key ? key.substring(0, 10) + "..." : "MISSING");

  if (!url || !key) {
    console.error("Missing credentials");
    return;
  }

  const supabase = createClient(url, key);
  
  // Try to list users (requires service role)
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  
  if (error) {
    console.error("Error connecting:", error.message);
  } else {
    console.log("Success! Users found:", data.users.length);
  }
}

verify();
