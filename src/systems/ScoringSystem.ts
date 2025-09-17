// Scoring system extracted from App.tsx

export interface ScoringConfig {
  basePoints: Record<string, number>;
  typeMultipliers: Record<string, number>;
  levelMultipliers: number[];
  bonuses: {
    levelComplete: number;
    survivalTime: number;
    lifeBonus: number;
    victoryBonus: number;
  };
}

export const SCORING_CONFIG: ScoringConfig = {
  basePoints: {
    asteroid: 10,
    barrier: 20,
    ship: 100,
    boss: 1000,
  },
  typeMultipliers: {
    small: 1.0,
    medium: 1.5,
    large: 2.0,
    boss: 5.0,
  },
  levelMultipliers: [1.0, 1.2, 1.4, 1.8, 2.2, 2.8, 3.5],
  bonuses: {
    levelComplete: 500,
    survivalTime: 10, // per second
    lifeBonus: 1000, // per remaining life
    victoryBonus: 5000,
  },
};

export interface ScorePopup {
  id: number;
  x: number;
  y: number;
  points: number;
  opacity: number;
  scale: number;
  vy: number;
}

export class ScoringSystem {
  private currentScore: number = 0;
  private scorePopups: ScorePopup[] = [];
  private nextPopupId: number = 1;

  getScore(): number {
    return this.currentScore;
  }

  setScore(score: number): void {
    this.currentScore = score;
  }

  addScore(points: number): void {
    this.currentScore += points;
  }

  calculateEnemyScore(
    enemyType: string,
    subType: string,
    radius: number,
    level: number
  ): number {
    const basePoints = SCORING_CONFIG.basePoints[enemyType] || 10;
    const typeMultiplier = SCORING_CONFIG.typeMultipliers[subType] || 1.0;
    const sizeMultiplier = Math.max(0.5, radius / 20);
    const levelMultiplier = SCORING_CONFIG.levelMultipliers[level - 1] || (level * 0.5);

    return Math.floor(basePoints * typeMultiplier * sizeMultiplier * levelMultiplier);
  }

  scoreAsteroidKill(asteroid: { x: number; y: number; r: number; type: string }, level: number): number {
    const points = this.calculateEnemyScore('asteroid', asteroid.type, asteroid.r, level);
    this.addScore(points);
    this.createScorePopup(asteroid.x, asteroid.y, points);
    return points;
  }

  scoreBarrierKill(barrier: { x: number; y: number; w: number; h: number }, level: number): number {
    const points = this.calculateEnemyScore('barrier', 'standard', Math.min(barrier.w, barrier.h), level);
    this.addScore(points);
    this.createScorePopup(barrier.x + barrier.w / 2, barrier.y + barrier.h / 2, points);
    return points;
  }

  scoreShipKill(ship: { x: number; y: number; r: number; type?: string }, level: number): number {
    const points = this.calculateEnemyScore('ship', ship.type || 'standard', ship.r, level);
    this.addScore(points);
    this.createScorePopup(ship.x, ship.y, points);
    return points;
  }

  scoreBossKill(boss: { x: number; y: number }, level: number): number {
    const points = this.calculateEnemyScore('boss', 'boss', 50, level);
    this.addScore(points);
    this.createScorePopup(boss.x, boss.y, points);
    return points;
  }

  createScorePopup(x: number, y: number, points: number): void {
    this.scorePopups.push({
      id: this.nextPopupId++,
      x,
      y,
      points,
      opacity: 1.0,
      scale: 1.0,
      vy: -60, // Float upward
    });
  }

  updateScorePopups(deltaTime: number): void {
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];

      // Update position
      popup.y += popup.vy * deltaTime;
      popup.vy *= 0.98; // Slow down over time

      // Update opacity and scale
      popup.opacity -= deltaTime * 1.5;
      popup.scale += deltaTime * 0.5;

      // Remove if faded out
      if (popup.opacity <= 0) {
        this.scorePopups.splice(i, 1);
      }
    }
  }

  getScorePopups(): ScorePopup[] {
    return this.scorePopups;
  }

  clearScorePopups(): void {
    this.scorePopups = [];
  }

  calculateFinalScore(
    baseScore: number,
    level: number,
    remainingLives: number,
    survivalTimeSeconds: number,
    victory: boolean
  ): number {
    let finalScore = baseScore;

    // Level completion bonus
    finalScore += SCORING_CONFIG.bonuses.levelComplete * (level - 1);

    // Survival time bonus
    finalScore += Math.floor(survivalTimeSeconds) * SCORING_CONFIG.bonuses.survivalTime;

    // Life bonus
    finalScore += remainingLives * SCORING_CONFIG.bonuses.lifeBonus;

    // Victory bonus
    if (victory) {
      finalScore += SCORING_CONFIG.bonuses.victoryBonus;
    }

    return finalScore;
  }

  reset(): void {
    this.currentScore = 0;
    this.clearScorePopups();
  }

  // Utility for ranking suffix
  getRankSuffix(rank: number): string {
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
}