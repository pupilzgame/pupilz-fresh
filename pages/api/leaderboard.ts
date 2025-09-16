import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// AAA Leaderboard Types
type LeaderboardEntry = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  victory: boolean;
  created_at: string;
  achievements: string[];
};

const MAX_ENTRIES = 10;
const MIN_SCORE_THRESHOLD = 100;

// Calculate achievements for a score
const calculateAchievements = (score: number, level: number, victory: boolean): string[] => {
  const achievements: string[] = [];
  if (victory) achievements.push('EARTH_REACHED');
  if (score >= 100000) achievements.push('CENTURION');
  if (score >= 250000) achievements.push('ELITE_PILOT');
  if (level >= 5) achievements.push('BOSS_FIGHTER');
  return achievements;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 API Handler called:', req.method);
    console.log('🔑 Environment check:', {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_ANON_KEY,
      url: process.env.SUPABASE_URL?.substring(0, 20) + '...'
    });

    if (req.method === 'GET') {
      console.log('📥 Fetching leaderboard entries...');
      // Get top leaderboard entries
      const { data: entries, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(MAX_ENTRIES);

      if (error) {
        console.error('❌ Supabase GET error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch leaderboard',
          details: error.message
        });
      }

      console.log('✅ Successfully fetched', entries?.length || 0, 'entries');

      // Transform data to match expected format
      const transformedEntries = entries?.map(entry => ({
        id: entry.id,
        playerName: entry.player_name,
        score: entry.score,
        level: entry.level,
        victory: entry.victory,
        timestamp: new Date(entry.created_at).getTime(),
        achievements: entry.achievements || []
      })) || [];

      res.status(200).json({
        entries: transformedEntries,
        success: true
      });

    } else if (req.method === 'POST') {
      console.log('📤 POST request received:', req.body);
      // Add new score
      const { playerName, score, level, victory } = req.body;

      // Validate input
      if (!playerName || typeof score !== 'number' || score < MIN_SCORE_THRESHOLD) {
        console.log('❌ Validation failed:', { playerName, score, level, victory });
        return res.status(400).json({
          success: false,
          error: 'Invalid input or score below threshold'
        });
      }

      // Create new entry
      const newEntry = {
        player_name: playerName.toUpperCase().substring(0, 3),
        score,
        level,
        victory,
        created_at: new Date().toISOString(),
        achievements: calculateAchievements(score, level, victory)
      };

      console.log('💾 Attempting to insert:', newEntry);

      // Insert into Supabase
      const { data, error } = await supabase
        .from('leaderboard')
        .insert([newEntry])
        .select()
        .single();

      if (error) {
        console.error('Supabase INSERT error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save score'
        });
      }

      // Get current rank by counting scores higher than this one
      const { count } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('score', score);

      const rank = (count || 0) + 1;

      res.status(200).json({
        success: true,
        rank,
        entry: {
          id: data.id,
          playerName: data.player_name,
          score: data.score,
          level: data.level,
          victory: data.victory,
          timestamp: new Date(data.created_at).getTime(),
          achievements: data.achievements || []
        }
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}