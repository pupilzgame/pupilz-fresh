// Simple script to create Supabase leaderboard table
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = 'your-service-role-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createLeaderboardTable() {
  console.log('🔨 Creating leaderboard table...');

  try {
    // Step 1: Drop existing table if it exists
    console.log('1. Dropping existing table (if any)...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS leaderboard CASCADE;'
    });

    if (dropError) {
      console.log('Drop table result:', dropError.message);
    }

    // Step 2: Create the table
    console.log('2. Creating leaderboard table...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE leaderboard (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          player_name text NOT NULL,
          score integer NOT NULL CHECK (score >= 0),
          level integer NOT NULL CHECK (level >= 1),
          victory boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          achievements text[] DEFAULT '{}'::text[]
        );
      `
    });

    if (createError) {
      console.error('❌ Failed to create table:', createError);
      return;
    }

    // Step 3: Create indexes
    console.log('3. Creating indexes...');
    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX idx_leaderboard_score ON leaderboard (score DESC);'
    });

    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX idx_leaderboard_created_at ON leaderboard (created_at DESC);'
    });

    // Step 4: Enable RLS
    console.log('4. Enabling Row Level Security...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;'
    });

    // Step 5: Create policies
    console.log('5. Creating security policies...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Anyone can view leaderboard" ON leaderboard
        FOR SELECT USING (true);
      `
    });

    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Anyone can add scores" ON leaderboard
        FOR INSERT WITH CHECK (true);
      `
    });

    // Step 6: Insert sample data
    console.log('6. Adding sample data...');
    const { error: insertError } = await supabase
      .from('leaderboard')
      .insert([
        { player_name: 'ACE', score: 125000, level: 5, victory: true, achievements: ['EARTH_REACHED', 'CENTURION'] },
        { player_name: 'TOP', score: 89500, level: 4, victory: false, achievements: ['BOSS_FIGHTER'] },
        { player_name: 'PRO', score: 67200, level: 3, victory: false, achievements: [] },
        { player_name: 'FLY', score: 45800, level: 2, victory: false, achievements: [] },
        { player_name: 'NEW', score: 12300, level: 1, victory: false, achievements: [] }
      ]);

    if (insertError) {
      console.error('❌ Failed to insert sample data:', insertError);
      return;
    }

    // Step 7: Verify
    console.log('7. Verifying table creation...');
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false });

    if (error) {
      console.error('❌ Failed to verify table:', error);
      return;
    }

    console.log('✅ SUCCESS! Leaderboard table created with', data.length, 'sample entries');
    console.log('Top entry:', data[0]);

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Instructions for the user
console.log(`
🔧 SUPABASE TABLE SETUP SCRIPT

Before running this script:
1. Go to Supabase Dashboard → Settings → API
2. Copy your Project URL and Service Role Key
3. Replace the values at the top of this file
4. Run: node create-table.js

`);

createLeaderboardTable();