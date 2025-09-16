-- DEBUGGING SUPABASE LEADERBOARD SETUP
-- This script temporarily disables RLS for testing

-- Step 1: Clean slate (remove any broken table)
DROP TABLE IF EXISTS leaderboard CASCADE;

-- Step 2: Create the table with all required columns
CREATE TABLE leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  score integer NOT NULL,
  level integer NOT NULL,
  victory boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  achievements text[] DEFAULT ARRAY[]::text[]
);

-- Step 3: Add sample data
INSERT INTO leaderboard (player_name, score, level, victory, achievements) VALUES
('ACE', 125000, 5, true, ARRAY['EARTH_REACHED', 'CENTURION']),
('TOP', 89500, 4, false, ARRAY['BOSS_FIGHTER']),
('PRO', 67200, 3, false, ARRAY[]::text[]),
('FLY', 45800, 2, false, ARRAY[]::text[]),
('NEW', 12300, 1, false, ARRAY[]::text[]);

-- Step 4: DISABLE RLS for testing (temporarily)
-- This removes all security restrictions for debugging
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;

-- Step 5: Create indexes for better performance
CREATE INDEX ON leaderboard (score DESC);
CREATE INDEX ON leaderboard (created_at DESC);

-- Step 6: Test that we can read and write
SELECT 'SUCCESS! Table created with ' || COUNT(*) || ' sample entries' as result FROM leaderboard;

-- Step 7: Test insert (this should work without RLS)
INSERT INTO leaderboard (player_name, score, level, victory, achievements)
VALUES ('TST', 999, 1, false, ARRAY[]::text[]);

SELECT 'INSERT TEST: Now has ' || COUNT(*) || ' entries' as insert_test FROM leaderboard;