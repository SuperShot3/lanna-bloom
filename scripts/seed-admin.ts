/**
 * One-time script to seed the first admin user.
 * Run: ADMIN_SEED_EMAIL=admin@example.com ADMIN_SEED_PASSWORD=yourpassword npx tsx scripts/seed-admin.ts
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.ADMIN_SEED_EMAIL?.trim()?.toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;

async function main() {
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash, is_active: true })
      .eq('email', email);
    if (error) {
      console.error('Update failed:', error.message);
      process.exit(1);
    }
    console.log('Admin user updated:', email);
  } else {
    const { error } = await supabase.from('admin_users').insert({
      email,
      password_hash: hash,
      role: 'OWNER',
      is_active: true,
    });
    if (error) {
      console.error('Insert failed:', error.message);
      process.exit(1);
    }
    console.log('Admin user created:', email);
  }
}

main();
