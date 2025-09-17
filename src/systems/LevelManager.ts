// Level progression and management system

export interface LevelConfig {
  level: number;
  shipQuota: number;
  ringRadius: number;
  ringSpeed: number;
  enemySpawnRate: number;
  enemyHealth: number;
  bossLevel: boolean;
}

export interface Ring {
  id: number;
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  active: boolean;
  type: 'level' | 'boss' | 'earth';
  color: string;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, shipQuota: 2, ringRadius: 60, ringSpeed: 50, enemySpawnRate: 1.0, enemyHealth: 1.0, bossLevel: false },
  { level: 2, shipQuota: 3, ringRadius: 55, ringSpeed: 55, enemySpawnRate: 1.2, enemyHealth: 1.1, bossLevel: false },
  { level: 3, shipQuota: 4, ringRadius: 50, ringSpeed: 60, enemySpawnRate: 1.4, enemyHealth: 1.2, bossLevel: false },
  { level: 4, shipQuota: 5, ringRadius: 45, ringSpeed: 65, enemySpawnRate: 1.6, enemyHealth: 1.3, bossLevel: false },
  { level: 5, shipQuota: 5, ringRadius: 40, ringSpeed: 70, enemySpawnRate: 2.0, enemyHealth: 1.5, bossLevel: true },
];

export class LevelManager {
  private currentLevel: number = 1;
  private shipsKilled: number = 0;
  private ring: Ring | null = null;
  private nextRingId: number = 1;
  private levelStartTime: number = 0;
  private ringRespawnTimer: number = 0;
  private bossDefeated: boolean = false;

  constructor() {
    this.reset();
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getShipsKilled(): number {
    return this.shipsKilled;
  }

  getShipQuota(): number {
    const config = this.getLevelConfig();
    return config?.shipQuota || 2;
  }

  getShipsRemaining(): number {
    return Math.max(0, this.getShipQuota() - this.shipsKilled);
  }

  getLevelConfig(): LevelConfig | null {
    return LEVEL_CONFIGS.find(config => config.level === this.currentLevel) || null;
  }

  getProgressText(): string {
    if (this.currentLevel >= 5 && !this.bossDefeated) {
      return 'DEFEAT BOSS';
    }

    const remaining = this.getShipsRemaining();
    if (remaining > 0) {
      return `🚀 ${this.shipsKilled}/${this.getShipQuota()}`;
    }

    return 'FLY THROUGH RING';
  }

  onShipKilled(): boolean {
    this.shipsKilled++;

    const quota = this.getShipQuota();
    if (this.shipsKilled >= quota) {
      this.spawnLevelRing();
      return true; // Quota met
    }

    return false;
  }

  onBossDefeated(): void {
    if (this.currentLevel >= 5) {
      this.bossDefeated = true;
      this.spawnEarthRing();
    }
  }

  private spawnLevelRing(): void {
    const config = this.getLevelConfig();
    if (!config) return;

    // Determine ring type and properties
    let ringType: Ring['type'] = 'level';
    let color = '#4CAF50'; // Green for normal levels

    if (config.bossLevel && !this.bossDefeated) {
      ringType = 'boss';
      color = '#FF8A80'; // Red for boss level
    }

    this.ring = {
      id: this.nextRingId++,
      x: Math.random() * 200 + 100, // Random X position
      y: -100, // Start above screen
      radius: config.ringRadius,
      targetRadius: config.ringRadius,
      active: true,
      type: ringType,
      color,
    };
  }

  private spawnEarthRing(): void {
    this.ring = {
      id: this.nextRingId++,
      x: Math.random() * 200 + 100,
      y: -100,
      radius: 80,
      targetRadius: 80,
      active: true,
      type: 'earth',
      color: '#2E7D32', // Dark green for Earth
    };
  }

  checkRingCollision(playerX: number, playerY: number, playerRadius: number): boolean {
    if (!this.ring || !this.ring.active) return false;

    const dx = playerX - this.ring.x;
    const dy = playerY - this.ring.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if player is inside the ring
    const innerRadius = this.ring.radius - 15; // Ring thickness
    const outerRadius = this.ring.radius + 15;

    if (distance >= innerRadius && distance <= outerRadius) {
      this.onRingHit();
      return true;
    }

    return false;
  }

  private onRingHit(): void {
    if (!this.ring) return;

    if (this.ring.type === 'earth') {
      // Victory!
      this.ring = null;
      return;
    }

    if (this.ring.type === 'boss') {
      // Boss level ring - triggers boss spawn
      this.ring = null;
      return;
    }

    // Normal level ring - advance to next level
    this.advanceLevel();
  }

  private advanceLevel(): void {
    this.currentLevel++;
    this.shipsKilled = 0;
    this.ring = null;
    this.levelStartTime = Date.now();
    this.bossDefeated = false;

    // Reset ring respawn timer
    this.ringRespawnTimer = 0;
  }

  updateRing(deltaTime: number, worldHeight: number): void {
    if (!this.ring) {
      // Check if we need to respawn a ring
      this.ringRespawnTimer += deltaTime;
      if (this.ringRespawnTimer >= 4.0 && this.shipsKilled >= this.getShipQuota()) {
        this.spawnLevelRing();
        this.ringRespawnTimer = 0;
      }
      return;
    }

    const config = this.getLevelConfig();
    if (!config) return;

    // Move ring down
    this.ring.y += config.ringSpeed * deltaTime;

    // Remove ring if it goes off screen
    if (this.ring.y > worldHeight + 100) {
      this.ring = null;
      this.ringRespawnTimer = 0; // Start respawn timer
    }
  }

  getRing(): Ring | null {
    return this.ring;
  }

  isLevelComplete(): boolean {
    return this.shipsKilled >= this.getShipQuota();
  }

  isBossLevel(): boolean {
    const config = this.getLevelConfig();
    return config?.bossLevel || false;
  }

  shouldSpawnBoss(): boolean {
    return this.isBossLevel() && this.isLevelComplete() && !this.ring && !this.bossDefeated;
  }

  isGameComplete(): boolean {
    return this.currentLevel > 5 && this.bossDefeated;
  }

  getLevelMultiplier(): number {
    // Scoring multiplier based on level
    const multipliers = [1.0, 1.2, 1.4, 1.8, 2.2, 2.8, 3.5];
    return multipliers[this.currentLevel - 1] || this.currentLevel * 0.5;
  }

  getEnemySpawnRate(): number {
    const config = this.getLevelConfig();
    return config?.enemySpawnRate || 1.0;
  }

  getEnemyHealthMultiplier(): number {
    const config = this.getLevelConfig();
    return config?.enemyHealth || 1.0;
  }

  // Debug and utility functions
  forceNextLevel(): void {
    this.shipsKilled = this.getShipQuota();
    this.spawnLevelRing();
  }

  getLevelStats(): {
    level: number;
    shipsKilled: number;
    shipQuota: number;
    hasRing: boolean;
    ringType: string | null;
    isComplete: boolean;
    isBoss: boolean;
  } {
    return {
      level: this.currentLevel,
      shipsKilled: this.shipsKilled,
      shipQuota: this.getShipQuota(),
      hasRing: this.ring !== null,
      ringType: this.ring?.type || null,
      isComplete: this.isLevelComplete(),
      isBoss: this.isBossLevel(),
    };
  }

  reset(): void {
    this.currentLevel = 1;
    this.shipsKilled = 0;
    this.ring = null;
    this.nextRingId = 1;
    this.levelStartTime = Date.now();
    this.ringRespawnTimer = 0;
    this.bossDefeated = false;
  }

  // Save/load state for persistence
  getState(): any {
    return {
      currentLevel: this.currentLevel,
      shipsKilled: this.shipsKilled,
      ring: this.ring,
      bossDefeated: this.bossDefeated,
    };
  }

  setState(state: any): void {
    this.currentLevel = state.currentLevel || 1;
    this.shipsKilled = state.shipsKilled || 0;
    this.ring = state.ring || null;
    this.bossDefeated = state.bossDefeated || false;
  }
}