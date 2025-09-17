import { circleCollision, rectCircleCollision } from '../utils/math';

// Entity interfaces
export interface CircleEntity {
  x: number;
  y: number;
  r: number;
}

export interface RectEntity {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Projectile extends CircleEntity {
  id: number;
  kind: string;
  vx: number;
  vy: number;
  damage: number;
  ttl: number;
}

export interface Enemy extends CircleEntity {
  id: number;
  type: string;
  health: number;
  lastHit?: number;
}

export interface Barrier extends RectEntity {
  id: number;
  health: number;
  lastHit?: number;
}

// Collision detection functions
export const checkProjectileEnemyCollisions = (
  projectiles: Projectile[],
  enemies: Enemy[],
  onHit: (projectile: Projectile, enemy: Enemy) => void
): void => {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      if (circleCollision(
        projectile.x, projectile.y, projectile.r,
        enemy.x, enemy.y, enemy.r
      )) {
        onHit(projectile, enemy);
        projectiles.splice(i, 1);
        break; // Projectile is destroyed, no need to check more enemies
      }
    }
  }
};

export const checkProjectileBarrierCollisions = (
  projectiles: Projectile[],
  barriers: Barrier[],
  onHit: (projectile: Projectile, barrier: Barrier) => void
): void => {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];

    for (let j = barriers.length - 1; j >= 0; j--) {
      const barrier = barriers[j];

      if (rectCircleCollision(
        barrier.x, barrier.y, barrier.w, barrier.h,
        projectile.x, projectile.y, projectile.r
      )) {
        onHit(projectile, barrier);
        projectiles.splice(i, 1);
        break;
      }
    }
  }
};

export const checkPlayerEnemyCollisions = (
  playerX: number,
  playerY: number,
  playerRadius: number,
  enemies: Enemy[],
  onCollision: (enemy: Enemy) => void
): void => {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (circleCollision(
      playerX, playerY, playerRadius,
      enemy.x, enemy.y, enemy.r
    )) {
      onCollision(enemy);
      enemies.splice(i, 1);
      break; // Player can only collide with one enemy per frame
    }
  }
};

export const checkPlayerBarrierCollisions = (
  playerX: number,
  playerY: number,
  playerRadius: number,
  barriers: Barrier[],
  onCollision: (barrier: Barrier) => void
): void => {
  for (let i = barriers.length - 1; i >= 0; i--) {
    const barrier = barriers[i];

    if (rectCircleCollision(
      barrier.x, barrier.y, barrier.w, barrier.h,
      playerX, playerY, playerRadius
    )) {
      onCollision(barrier);
      barriers.splice(i, 1);
      break;
    }
  }
};

export const checkSweepCollisions = (
  sweepX: number,
  sweepY: number,
  sweepRadius: number,
  enemies: Enemy[],
  barriers: Barrier[],
  onEnemyHit: (enemy: Enemy) => void,
  onBarrierHit: (barrier: Barrier) => void
): void => {
  // Check enemy collisions
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (circleCollision(
      sweepX, sweepY, sweepRadius,
      enemy.x, enemy.y, enemy.r
    )) {
      onEnemyHit(enemy);
      enemies.splice(i, 1);
    }
  }

  // Check barrier collisions
  for (let i = barriers.length - 1; i >= 0; i--) {
    const barrier = barriers[i];

    if (rectCircleCollision(
      barrier.x, barrier.y, barrier.w, barrier.h,
      sweepX, sweepY, sweepRadius
    )) {
      onBarrierHit(barrier);
      barriers.splice(i, 1);
    }
  }
};

export const checkRingCollision = (
  playerX: number,
  playerY: number,
  playerRadius: number,
  ringX: number,
  ringY: number,
  ringRadius: number
): boolean => {
  return circleCollision(
    playerX, playerY, playerRadius,
    ringX, ringY, ringRadius
  );
};

export const findClosestEnemy = (
  fromX: number,
  fromY: number,
  enemies: Enemy[],
  maxDistance: number = Infinity
): Enemy | null => {
  let closest: Enemy | null = null;
  let closestDistance = maxDistance;

  for (const enemy of enemies) {
    const dx = enemy.x - fromX;
    const dy = enemy.y - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closest = enemy;
      closestDistance = distance;
    }
  }

  return closest;
};

export const findEnemiesInRange = (
  fromX: number,
  fromY: number,
  enemies: Enemy[],
  range: number
): Enemy[] => {
  return enemies.filter(enemy => {
    const dx = enemy.x - fromX;
    const dy = enemy.y - fromY;
    return dx * dx + dy * dy <= range * range;
  });
};

// Main CollisionSystem class for easy instantiation
export class CollisionSystem {
  private spatialGrid: SpatialGrid;

  constructor(cellSize: number = 100, width: number = 800, height: number = 600) {
    this.spatialGrid = new SpatialGrid(cellSize, width, height);
  }

  // Convenience method that wraps the existing functions
  checkProjectileCollisions(projectiles: Projectile[], allEntities: { [key: string]: any[] }): Array<{ projectile: Projectile, target: any, targetCategory: string }> {
    const hits: Array<{ projectile: Projectile, target: any, targetCategory: string }> = [];

    // Check against asteroids
    if (allEntities.asteroids) {
      for (const projectile of projectiles) {
        for (const asteroid of allEntities.asteroids) {
          if (circleCollision(
            projectile.x, projectile.y, projectile.r,
            asteroid.x, asteroid.y, asteroid.r
          )) {
            hits.push({ projectile, target: asteroid, targetCategory: 'asteroids' });
          }
        }
      }
    }

    // Check against barriers
    if (allEntities.barriers) {
      for (const projectile of projectiles) {
        for (const barrier of allEntities.barriers) {
          if (rectCircleCollision(
            barrier.x, barrier.y, barrier.w, barrier.h,
            projectile.x, projectile.y, projectile.r
          )) {
            hits.push({ projectile, target: barrier, targetCategory: 'barriers' });
          }
        }
      }
    }

    // Check against ships
    if (allEntities.ships) {
      for (const projectile of projectiles) {
        for (const ship of allEntities.ships) {
          if (circleCollision(
            projectile.x, projectile.y, projectile.r,
            ship.x, ship.y, ship.r
          )) {
            hits.push({ projectile, target: ship, targetCategory: 'ships' });
          }
        }
      }
    }

    return hits;
  }

  // Utility methods
  checkPlayerCollisions(playerX: number, playerY: number, playerRadius: number, enemies: Enemy[]): Enemy[] {
    const collisions: Enemy[] = [];
    for (const enemy of enemies) {
      if (circleCollision(playerX, playerY, playerRadius, enemy.x, enemy.y, enemy.r)) {
        collisions.push(enemy);
      }
    }
    return collisions;
  }

  checkRingCollision(playerX: number, playerY: number, playerRadius: number, ringX: number, ringY: number, ringRadius: number): boolean {
    return circleCollision(playerX, playerY, playerRadius, ringX, ringY, ringRadius);
  }
}

// Spatial partitioning for performance optimization
export class SpatialGrid {
  private cellSize: number;
  private width: number;
  private height: number;
  private grid: Map<string, Enemy[]>;

  constructor(cellSize: number, width: number, height: number) {
    this.cellSize = cellSize;
    this.width = width;
    this.height = height;
    this.grid = new Map();
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  clear(): void {
    this.grid.clear();
  }

  addEnemy(enemy: Enemy): void {
    const key = this.getCellKey(enemy.x, enemy.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(enemy);
  }

  getNearbyEnemies(x: number, y: number, radius: number): Enemy[] {
    const nearby: Enemy[] = [];
    const cells = Math.ceil(radius / this.cellSize);

    for (let dx = -cells; dx <= cells; dx++) {
      for (let dy = -cells; dy <= cells; dy++) {
        const cellX = Math.floor(x / this.cellSize) + dx;
        const cellY = Math.floor(y / this.cellSize) + dy;
        const key = `${cellX},${cellY}`;

        const cellEnemies = this.grid.get(key);
        if (cellEnemies) {
          nearby.push(...cellEnemies);
        }
      }
    }

    return nearby;
  }

  rebuild(enemies: Enemy[]): void {
    this.clear();
    for (const enemy of enemies) {
      this.addEnemy(enemy);
    }
  }
}