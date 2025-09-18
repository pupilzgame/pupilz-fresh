/**
 * Scoring system utilities
 * Centralized scoring calculations and popup management
 */

export interface ScorePopup {
  id: number;
  x: number;
  y: number;
  score: number;
  ttl: number;
  maxTtl: number;
}

export interface ScoreCounter {
  current: number;
}

// Scoring configuration constants
export const SCORING_CONFIG = {
  basePoints: {
    asteroid: 10,
    barrier: 20,
    ship: 100,
    boss: 1000,
  },
  typeMultipliers: {
    debris: 0.5,
    crystal: 0.7,
    rock: 1.0,
    energy: 1.0,
    metal: 1.5,
    asteroid: 2.0,
    wreckage: 1.8,
  },
  levelMultipliers: [1.0, 1.0, 1.5, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0],
  bonuses: {
    survival: 2,
    levelComplete: 200,
    lifeBonus: 300,
    victoryBonus: 2000,
  },
} as const;

/**
 * Calculate enemy kill score based on type, size, and level
 */
export const calculateEnemyScore = (
  enemyType: 'asteroid' | 'barrier' | 'ship' | 'boss',
  subType: string,
  radius: number = 20,
  level: number = 1
): number => {
  const basePoints = SCORING_CONFIG.basePoints[enemyType] || 10;
  const typeMultiplier = SCORING_CONFIG.typeMultipliers[subType as keyof typeof SCORING_CONFIG.typeMultipliers] || 1.0;
  const sizeMultiplier = Math.max(0.5, radius / 20);
  const levelMultiplier = SCORING_CONFIG.levelMultipliers[level - 1] || (level * 0.5);

  return Math.round(basePoints * typeMultiplier * sizeMultiplier * levelMultiplier);
};

/**
 * Add points to the score counter with logging
 */
export const addScore = (
  scoreCounter: ScoreCounter,
  points: number,
  source?: string
) => {
  console.log(`🎯 Adding ${points} points from ${source} (Before: ${scoreCounter.current})`);
  scoreCounter.current += points;
  console.log(`🎯 Score now: ${scoreCounter.current}`);
  if (points < 0) {
    console.warn(`⚠️ NEGATIVE POINTS DETECTED! ${points} from ${source}`);
    console.trace();
  }
};

/**
 * Create a score popup with random offset
 */
export const createScorePopup = (
  x: number,
  y: number,
  score: number,
  currentPopups: ScorePopup[]
): ScorePopup => {
  const id = (currentPopups[currentPopups.length - 1]?.id ?? 0) + 1;
  const maxTtl = 1.5; // 1.5 seconds duration

  return {
    id,
    x: x + (Math.random() * 20 - 10), // Small random horizontal offset
    y,
    score,
    ttl: maxTtl,
    maxTtl
  };
};

/**
 * Calculate final score with all bonuses (mutates the scoreCounter)
 */
export const calculateFinalScore = (
  scoreCounter: ScoreCounter,
  timeSec: number,
  sessionStartTime: number,
  lives: number,
  level: number,
  isVictory: boolean = false
): number => {
  console.log(`🔍 FINAL SCORE DEBUG - Starting score: ${scoreCounter.current}`);
  console.log(`🔍 Time: ${timeSec}, SessionStart: ${sessionStartTime}, Lives: ${lives}, Level: ${level}`);

  // Add survival bonus
  const survivalTime = Math.floor(timeSec - sessionStartTime);
  const survivalPoints = survivalTime * SCORING_CONFIG.bonuses.survival;
  console.log(`🔍 Survival: ${survivalTime}s * ${SCORING_CONFIG.bonuses.survival} = ${survivalPoints}`);
  addScore(scoreCounter, survivalPoints, `${survivalTime}s survival`);

  // Add life bonus
  const lifeBonus = lives * SCORING_CONFIG.bonuses.lifeBonus;
  console.log(`🔍 Life bonus: ${lives} lives * ${SCORING_CONFIG.bonuses.lifeBonus} = ${lifeBonus}`);
  if (lifeBonus > 0) {
    addScore(scoreCounter, lifeBonus, `${lives} lives remaining`);
  }

  // Add victory bonus if applicable
  if (isVictory) {
    console.log(`🔍 Victory bonus: ${SCORING_CONFIG.bonuses.victoryBonus}`);
    addScore(scoreCounter, SCORING_CONFIG.bonuses.victoryBonus, 'victory bonus');
  }

  console.log(`🔍 FINAL CALCULATED SCORE: ${scoreCounter.current}`);
  return scoreCounter.current;
};