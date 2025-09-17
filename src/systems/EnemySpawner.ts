// Enemy spawning and AI management system
import { rand, clamp } from '../utils/math';

// Enemy types and configurations
export type AsteroidType = "rock" | "metal" | "crystal" | "debris" | "wreckage";
export type BarrierType = "metal" | "energy" | "asteroid" | "debris";
export type EnemyShipKind = "scout" | "fighter";
export type PUKind = "S" | "M" | "L" | "F" | "H" | "R" | "B" | "E" | "T" | "D" | "N";

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  type: AsteroidType;
  hp: number;
  maxHp: number;
  lastHit: number;
}

export interface Barrier {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  type: BarrierType;
  hp: number;
  maxHp: number;
  lastHit: number;
}

export interface EnemyShip {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  fireCD: number;
  kind: EnemyShipKind;
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  kind: PUKind;
  vy: number;
}

export interface Boss {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  hpMax: number;
  fireT: number;
  pattern: number;
}

// Spawning constants (inferred from code analysis)
const SPAWN_CONSTANTS = {
  // Asteroid constants
  AST_MIN_R: 18,
  AST_MAX_R: 45,
  AST_MAX_VX: 60,
  AST_REL_VY: 120,
  AST_BASE_SPACING: 280,

  // Barrier constants
  BAR_W_MIN: 60,
  BAR_W_MAX: 140,
  BAR_H: 25,
  BAR_VX: 30,
  BAR_REL_VY: 85,
  BAR_BASE_SPACING: 380,

  // Ship constants
  SHIP_BASE_SPACING: 420,

  // Power-up constants
  PWR_BASE_SPACING: 600,

  // Level constants
  LEVEL_MIN: 800,
  LEVEL_MAX: 1200,
};

// Asteroid type configurations
const ASTEROID_TYPE_DATA = {
  rock: { sizeMult: 1.0, hpMult: 1.0, speedMult: 1.0, color: '#8D6E63', damageColor: '#6D4C41' },
  metal: { sizeMult: 1.2, hpMult: 1.8, speedMult: 0.7, color: '#78909C', damageColor: '#546E7A' },
  crystal: { sizeMult: 0.8, hpMult: 0.6, speedMult: 1.4, color: '#9C27B0', damageColor: '#7B1FA2' },
  debris: { sizeMult: 0.6, hpMult: 0.4, speedMult: 1.6, color: '#FF6F00', damageColor: '#E65100' },
  wreckage: { sizeMult: 1.5, hpMult: 2.2, speedMult: 0.5, color: '#795548', damageColor: '#5D4037' },
};

// Barrier type configurations
const BARRIER_TYPE_DATA = {
  metal: { hpMult: 1.5, color: "#C04E4E", border: "#7A2F2F", height: SPAWN_CONSTANTS.BAR_H },
  energy: { hpMult: 1.0, color: "#9333EA", border: "#5B21B6", height: SPAWN_CONSTANTS.BAR_H * 1.2 },
  asteroid: { hpMult: 2.0, color: "#78716C", border: "#44403C", height: SPAWN_CONSTANTS.BAR_H * 0.8 },
  debris: { hpMult: 0.8, color: "#EA580C", border: "#C2410C", height: SPAWN_CONSTANTS.BAR_H * 0.6 },
};

export interface SpawnConfig {
  width: number;
  height: number;
  level: number;
  scrollY: number;
  bufferDistance: number;
}

export interface SpawnState {
  nextAstY: number;
  nextBarY: number;
  nextPwrY: number;
  nextShipY: number;
}

export class EnemySpawner {
  private spawnState: SpawnState;
  private entityArrays: {
    asteroids: Asteroid[];
    barriers: Barrier[];
    ships: EnemyShip[];
    powerups: PowerUp[];
  };

  constructor() {
    this.spawnState = {
      nextAstY: 0,
      nextBarY: 0,
      nextPwrY: 0,
      nextShipY: 0,
    };

    this.entityArrays = {
      asteroids: [],
      barriers: [],
      ships: [],
      powerups: [],
    };
  }

  // Initialize spawn positions
  initializeSpawnPositions(config: SpawnConfig): void {
    const viewBottom = config.scrollY + config.height;
    this.spawnState.nextAstY = viewBottom + rand(80, 200);
    this.spawnState.nextBarY = viewBottom + rand(140, 260);
    this.spawnState.nextPwrY = viewBottom + rand(200, 360);
    this.spawnState.nextShipY = viewBottom + rand(260, 420);
  }

  // Create a new asteroid
  createAsteroid(id: number, worldY: number, config: SpawnConfig): Asteroid {
    // Weighted random asteroid type selection
    const typeWeights = {
      rock: 40,      // Most common
      metal: 20,     // Tough
      crystal: 15,   // Fast but fragile
      debris: 15,    // Small and fast
      wreckage: 10   // Large but slow
    };

    const total = Object.values(typeWeights).reduce((a, b) => a + b, 0);
    let rand_val = Math.random() * total;
    let selectedType: AsteroidType = "rock";

    for (const [type, weight] of Object.entries(typeWeights)) {
      rand_val -= weight;
      if (rand_val <= 0) {
        selectedType = type as AsteroidType;
        break;
      }
    }

    const typeData = ASTEROID_TYPE_DATA[selectedType];
    const baseRadius = rand(SPAWN_CONSTANTS.AST_MIN_R, SPAWN_CONSTANTS.AST_MAX_R);
    const r = Math.round(baseRadius * typeData.sizeMult);
    const baseHP = Math.max(1, Math.round((r / 20) * 3)); // Scale with size
    const hp = Math.round(baseHP * typeData.hpMult);

    return {
      id,
      x: rand(r + 10, config.width - r - 10),
      y: worldY,
      vx: rand(-SPAWN_CONSTANTS.AST_MAX_VX, SPAWN_CONSTANTS.AST_MAX_VX) * typeData.speedMult,
      vy: SPAWN_CONSTANTS.AST_REL_VY * (Math.random() * 0.6 + 0.7) * typeData.speedMult,
      r,
      type: selectedType,
      hp,
      maxHp: hp,
      lastHit: 0
    };
  }

  // Create a new barrier
  createBarrier(id: number, worldY: number, config: SpawnConfig): Barrier {
    // Weighted barrier types
    const barrierTypes: BarrierType[] = ["metal", "energy", "asteroid", "debris"];
    const weights = [40, 25, 20, 15];

    const total = weights.reduce((a, b) => a + b, 0);
    let rand_val = Math.random() * total;
    let selectedType: BarrierType = "metal";

    for (let i = 0; i < barrierTypes.length; i++) {
      rand_val -= weights[i];
      if (rand_val <= 0) {
        selectedType = barrierTypes[i];
        break;
      }
    }

    const typeData = BARRIER_TYPE_DATA[selectedType];
    const wv = rand(SPAWN_CONSTANTS.BAR_W_MIN, SPAWN_CONSTANTS.BAR_W_MAX);
    const baseHP = Math.max(2, Math.round((wv / 50) * 3));
    const hp = Math.round(baseHP * typeData.hpMult);

    return {
      id,
      x: rand(10, config.width - 10 - wv),
      y: worldY,
      w: wv,
      h: typeData.height,
      vx: Math.random() < 0.5 ? -SPAWN_CONSTANTS.BAR_VX : SPAWN_CONSTANTS.BAR_VX,
      vy: SPAWN_CONSTANTS.BAR_REL_VY * (Math.random() * 0.6 + 0.7),
      type: selectedType,
      hp,
      maxHp: hp,
      lastHit: 0
    };
  }

  // Create a new power-up
  createPowerUp(id: number, worldY: number, config: SpawnConfig): PowerUp {
    // Base power-ups available at all levels
    const baseBag: PUKind[] = ["S","M","L","F","H","R","B","E","T","D"];

    // Nuke availability: Only after Level 2 (skill mastery first)
    const nukeChance = config.level >= 3 ? 0.08 : 0; // 8% chance after Level 2

    // Roll for nuke first (if available)
    if (nukeChance > 0 && Math.random() < nukeChance) {
      return { id, x: rand(22, config.width - 22), y: worldY, kind: "N", vy: 15 + Math.random() * 20 };
    }

    // Regular power-up selection
    const kind = baseBag[Math.floor(Math.random() * baseBag.length)];
    return { id, x: rand(22, config.width - 22), y: worldY, kind, vy: 15 + Math.random() * 20 };
  }

  // Create a new enemy ship
  createEnemyShip(id: number, worldY: number, config: SpawnConfig): EnemyShip {
    const kind: EnemyShipKind = Math.random() < 0.55 ? "scout" : "fighter";
    const hp = kind === "scout" ? (2 + Math.max(0, config.level - 1)) : (4 + Math.max(0, config.level) * 1.2);
    return {
      id,
      x: rand(28, config.width - 28),
      y: worldY,
      vx: (Math.random() < 0.5 ? -1 : 1) * rand(40, 80),
      vy: rand(26, 46),
      hp: Math.round(hp),
      fireCD: rand(0.8, 1.6),
      kind,
    };
  }

  // Main spawning function
  spawnAhead(config: SpawnConfig, bossActive: boolean = false): {
    asteroids: Asteroid[];
    barriers: Barrier[];
    ships: EnemyShip[];
    powerups: PowerUp[];
  } {
    const viewBottom = config.scrollY + config.height;
    const bufferBelow = config.bufferDistance;
    const newEntities = {
      asteroids: [] as Asteroid[],
      barriers: [] as Barrier[],
      ships: [] as EnemyShip[],
      powerups: [] as PowerUp[],
    };

    // Spawn asteroids
    while (this.spawnState.nextAstY < viewBottom + bufferBelow) {
      const id = (this.entityArrays.asteroids[this.entityArrays.asteroids.length - 1]?.id ?? -1) + 1;
      const y = this.spawnState.nextAstY;

      // Occasionally spawn asteroid clusters for variety
      if (Math.random() < 0.15) {
        // Asteroid cluster - 2-4 asteroids close together
        const clusterSize = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < clusterSize; i++) {
          const clusterAst = this.createAsteroid(id + i, y + rand(-30, 30), config);
          // Vary positions slightly
          clusterAst.x = clamp(clusterAst.x + rand(-50, 50), clusterAst.r + 10, config.width - clusterAst.r - 10);
          newEntities.asteroids.push(clusterAst);
        }
        this.spawnState.nextAstY = y + rand(200, 350);
      } else {
        // Single asteroid
        newEntities.asteroids.push(this.createAsteroid(id, y, config));
        const aSpace = SPAWN_CONSTANTS.AST_BASE_SPACING * Math.max(0.7, 1 - 0.06 * (config.level - 1));
        this.spawnState.nextAstY = y + rand(aSpace * 0.85, aSpace * 1.2);
      }
    }

    // Spawn barriers
    while (this.spawnState.nextBarY < viewBottom + bufferBelow) {
      const id = (this.entityArrays.barriers[this.entityArrays.barriers.length - 1]?.id ?? -1) + 1;
      const y = this.spawnState.nextBarY;

      // Occasionally spawn barrier walls for challenge
      if (Math.random() < 0.12) {
        // Barrier wall with gaps
        const wallCount = 2 + Math.floor(Math.random() * 2);
        const gapSize = rand(80, 120);
        let currentX = 20;

        for (let i = 0; i < wallCount && currentX < config.width - 60; i++) {
          const barrier = this.createBarrier(id + i, y, config);
          barrier.x = currentX;
          barrier.w = rand(60, 100);
          currentX += barrier.w + gapSize;
          newEntities.barriers.push(barrier);
        }
        this.spawnState.nextBarY = y + rand(400, 600);
      } else {
        // Single barrier
        newEntities.barriers.push(this.createBarrier(id, y, config));
        const bSpace = SPAWN_CONSTANTS.BAR_BASE_SPACING * Math.max(0.75, 1 - 0.05 * (config.level - 1));
        this.spawnState.nextBarY = y + rand(bSpace * 0.9, bSpace * 1.25);
      }
    }

    // Spawn power-ups
    while (this.spawnState.nextPwrY < viewBottom + bufferBelow) {
      const id = (this.entityArrays.powerups[this.entityArrays.powerups.length - 1]?.id ?? -1) + 1;
      const y = this.spawnState.nextPwrY;
      newEntities.powerups.push(this.createPowerUp(id, y, config));
      this.spawnState.nextPwrY = y + rand(SPAWN_CONSTANTS.PWR_BASE_SPACING * 0.9, SPAWN_CONSTANTS.PWR_BASE_SPACING * 1.4);
    }

    // Pause ship spawns if boss is active
    while (!bossActive && this.spawnState.nextShipY < viewBottom + bufferBelow) {
      const id = (this.entityArrays.ships[this.entityArrays.ships.length - 1]?.id ?? -1) + 1;
      const y = this.spawnState.nextShipY;
      newEntities.ships.push(this.createEnemyShip(id, y, config));
      const sSpace = SPAWN_CONSTANTS.SHIP_BASE_SPACING * Math.max(0.8, 1 - 0.04 * (config.level - 1));
      this.spawnState.nextShipY = y + rand(sSpace * 0.85, sSpace * 1.25);
    }

    return newEntities;
  }

  // Get asteroid type data
  getAsteroidTypeData(type: AsteroidType) {
    return ASTEROID_TYPE_DATA[type];
  }

  // Get barrier type data
  getBarrierTypeData(type: BarrierType) {
    return BARRIER_TYPE_DATA[type];
  }

  // Reset spawner state
  reset(): void {
    this.spawnState = {
      nextAstY: 0,
      nextBarY: 0,
      nextPwrY: 0,
      nextShipY: 0,
    };

    this.entityArrays = {
      asteroids: [],
      barriers: [],
      ships: [],
      powerups: [],
    };
  }

  // Update entity references (for tracking spawned entities)
  updateEntityArrays(entities: {
    asteroids: Asteroid[];
    barriers: Barrier[];
    ships: EnemyShip[];
    powerups: PowerUp[];
  }): void {
    this.entityArrays = entities;
  }

  // Get spawn state for debugging
  getSpawnState(): SpawnState {
    return { ...this.spawnState };
  }

  // Set spawn state (useful for loading saved games)
  setSpawnState(state: Partial<SpawnState>): void {
    this.spawnState = { ...this.spawnState, ...state };
  }
}