-- Create leaderboard table for Pupilz game
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  level integer NOT NULL CHECK (level >= 1),
  victory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  achievements text[] DEFAULT '{}'::text[]
);

-- Create index for efficient score-based queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);

-- Create index for efficient timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to everyone
CREATE POLICY "Anyone can view leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Create policy to allow insert access to everyone (for adding scores)
CREATE POLICY "Anyone can add scores" ON leaderboard
  FOR INSERT WITH CHECK (true);

-- Optional: Insert some sample data for testing
INSERT INTO leaderboard (player_name, score, level, victory, achievements) VALUES
  ('ACE', 125000, 5, true, '{"EARTH_REACHED", "CENTURION"}'),
  ('TOP', 89500, 4, false, '{"BOSS_FIGHTER"}'),
  ('PRO', 67200, 3, false, '{}'),
  ('FLY', 45800, 2, false, '{}'),
  ('NEW', 12300, 1, false, '{}')
ON CONFLICT DO NOTHING;