const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) process.env[key.trim()] = value.trim();
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("\n❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("\nTo fix this:");
  console.error("1. Go to https://app.supabase.com");
  console.error("2. Select your H.E.M project");
  console.error("3. Go to Settings → API");
  console.error("4. Copy the 'service_role' key (the SECRET one)");
  console.error("5. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=<paste_key_here>");
  console.error("\nOr manually create a user:");
  console.error("1. Go to https://app.supabase.com → H.E.M project");
  console.error("2. Go to Authentication → Users");
  console.error("3. Click '+ Create new user'");
  console.error("4. Email: owner@example.com");
  console.error("5. Password: Owner123!@#");
  console.error("6. Click Create user");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  const testEmail = "owner@example.com";
  const testPassword = "Owner123!@#";

  try {
    console.log(`\nCreating admin user: ${testEmail}`);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (error) {
      console.error("❌ Error creating user:", error.message);
      if (error.message.includes("already registered")) {
        console.log("\n✅ User already exists!");
        console.log(`Email: ${testEmail}`);
        console.log(`Password: ${testPassword}`);
        console.log("\nYou can now login at http://localhost:3000/owner");
      }
      process.exit(1);
    }

    console.log("✅ Test user created successfully!");
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log("\nYou can now login at http://localhost:3000/owner");
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
    process.exit(1);
  }
}

createTestUser();
