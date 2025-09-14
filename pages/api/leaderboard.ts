import { kv } from '@vercel/kv';
import type { NextApiRequest, NextApiResponse } from 'next';

// AAA Leaderboard Types
type LeaderboardEntry = {
  id: string;
  playerName: string;
  score: number;
  level: number;
  victory: boolean;
  timestamp: number;
  achievements: string[];
};

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  personalBest?: number;
  lastRank?: number | null;
};

const LEADERBOARD_KEY = 'pupilz_global_leaderboard';
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
    if (req.method === 'GET') {
      // Get leaderboard
      const entries = await kv.lrange(LEADERBOARD_KEY, 0, MAX_ENTRIES - 1);
      const parsedEntries = entries.map(entry =>
        typeof entry === 'string' ? JSON.parse(entry) : entry
      ) as LeaderboardEntry[];

      res.status(200).json({
        entries: parsedEntries,
        success: true
      });

    } else if (req.method === 'POST') {
      // Add new score
      const { playerName, score, level, victory } = req.body;

      // Validate input
      if (!playerName || typeof score !== 'number' || score < MIN_SCORE_THRESHOLD) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input or score below threshold'
        });
      }

      // Create new entry
      const newEntry: LeaderboardEntry = {
        id: Date.now().toString() + Math.random().toString(36),
        playerName: playerName.toUpperCase().substring(0, 3),
        score,
        level,
        victory,
        timestamp: Date.now(),
        achievements: calculateAchievements(score, level, victory)
      };

      // Get current leaderboard
      const currentEntries = await kv.lrange(LEADERBOARD_KEY, 0, -1);
      const parsedCurrentEntries = currentEntries.map(entry =>
        typeof entry === 'string' ? JSON.parse(entry) : entry
      ) as LeaderboardEntry[];

      // Add new entry and sort by score (descending)
      const updatedEntries = [...parsedCurrentEntries, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTRIES);

      // Find the rank of the new entry
      const rank = updatedEntries.findIndex(entry => entry.id === newEntry.id) + 1;

      // Clear old leaderboard and add updated entries
      await kv.del(LEADERBOARD_KEY);
      if (updatedEntries.length > 0) {
        const serializedEntries = updatedEntries.map(entry => JSON.stringify(entry));
        await kv.rpush(LEADERBOARD_KEY, ...serializedEntries);
      }

      res.status(200).json({
        success: true,
        rank,
        entry: newEntry
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