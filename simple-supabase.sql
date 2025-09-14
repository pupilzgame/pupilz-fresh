-- SIMPLE SUPABASE TABLE CREATION
-- Copy and paste this entire script into Supabase SQL Editor and click RUN

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

-- Step 3: Add some sample data so you can see it working
INSERT INTO leaderboard (player_name, score, level, victory, achievements) VALUES
('ACE', 125000, 5, true, ARRAY['EARTH_REACHED', 'CENTURION']),
('TOP', 89500, 4, false, ARRAY['BOSS_FIGHTER']),
('PRO', 67200, 3, false, ARRAY[]::text[]),
('FLY', 45800, 2, false, ARRAY[]::text[]),
('NEW', 12300, 1, false, ARRAY[]::text[]);

-- Step 4: Enable security so your API can access it
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON leaderboard FOR INSERT WITH CHECK (true);

-- Step 5: Create indexes for better performance
CREATE INDEX ON leaderboard (score DESC);
CREATE INDEX ON leaderboard (created_at DESC);

-- Step 6: Verify it worked
SELECT 'SUCCESS! Table created with ' || COUNT(*) || ' sample entries' as result FROM leaderboard;