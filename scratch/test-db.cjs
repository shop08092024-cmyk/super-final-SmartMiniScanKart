const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
let viteSupabaseUrl = 'https://tntujmcsiwjpaufoqrsx.supabase.co';
let viteSupabaseAnonKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      
      if (key === 'VITE_SUPABASE_URL') viteSupabaseUrl = value;
      if (key === 'VITE_SUPABASE_ANON_KEY') viteSupabaseAnonKey = value;
    }
  }
} catch (e) {
  console.error("Error reading .env file:", e.message);
}

if (!viteSupabaseAnonKey) {
  console.error("Could not find VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(viteSupabaseUrl, viteSupabaseAnonKey);

async function testQuery() {
  console.log("Connecting to Supabase at:", viteSupabaseUrl);
  try {
    const { data, error } = await supabase
      .from('shop_profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error("Supabase returned error:", error);
    } else {
      console.log("Success! Query returned data:", data);
    }
  } catch (err) {
    console.error("Exception thrown during query:", err);
  }
}

testQuery();
