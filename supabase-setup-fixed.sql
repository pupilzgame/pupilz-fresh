-- Step 1: Drop existing table if it has wrong structure
DROP TABLE IF EXISTS leaderboard;

-- Step 2: Create leaderboard table for Pupilz game (fresh start)
CREATE TABLE leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  level integer NOT NULL CHECK (level >= 1),
  victory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  achievements text[] DEFAULT '{}'::text[]
);

-- Step 3: Create index for efficient score-based queries
CREATE INDEX idx_leaderboard_score ON leaderboard (score DESC);

-- Step 4: Create index for efficient timestamp-based queries
CREATE INDEX idx_leaderboard_created_at ON leaderboard (created_at DESC);

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policy to allow read access to everyone
CREATE POLICY "Anyone can view leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Step 7: Create policy to allow insert access to everyone (for adding scores)
CREATE POLICY "Anyone can add scores" ON leaderboard
  FOR INSERT WITH CHECK (true);

-- Step 8: Insert sample data for testing
INSERT INTO leaderboard (player_name, score, level, victory, achievements) VALUES
  ('ACE', 125000, 5, true, ARRAY['EARTH_REACHED', 'CENTURION']),
  ('TOP', 89500, 4, false, ARRAY['BOSS_FIGHTER']),
  ('PRO', 67200, 3, false, ARRAY[]::text[]),
  ('FLY', 45800, 2, false, ARRAY[]::text[]),
  ('NEW', 12300, 1, false, ARRAY[]::text[]);

-- Step 9: Verify the table was created correctly
SELECT 'Table created successfully!' as status;
SELECT COUNT(*) as sample_data_count FROM leaderboard;