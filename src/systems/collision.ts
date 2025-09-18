/**
 * Collision detection system for game entities
 * Centralizes all collision logic from App.tsx
 */

import { MutableRefObject } from 'react';
import { circleCollision, rectCircleCollision, clamp } from '../utils/math';

// Game entity interfaces
export interface GameObject {
  x: number;
  y: number;
  r?: number; // radius for circle collision
  w?: number; // width for rect collision
  h?: number; // height for rect collision
}

export interface Projectile extends GameObject {
  r: number;
  kind: string;
}

export interface Asteroid extends GameObject {
  r: number;
  type: string;
  hp: number;
}

export interface Barrier extends GameObject {
  w: number;
  h: number;
  type: string;
  hp: number;
}

export interface Ship extends GameObject {
  hp: number;
}

export interface Boss extends GameObject {
  active: boolean;
  hp: number;
  hpMax: number;
}

export interface EnemyProjectile extends GameObject {
  r: number;
}

export interface Drone extends GameObject {
  active: boolean;
}

export interface PowerUp extends GameObject {
  kind: string;
}

export interface WeaponConfig {
  level: number;
}

export interface GameConstants {
  POD_RADIUS: number;
  MAX_SHIELD_LIVES: number;
  BOSS_COLLISION_RADIUS: number;
}

// Collision result interfaces
export interface CollisionResult {
  hit: boolean;
  damage?: number;
  removeProjectile?: boolean;
  removeTarget?: boolean;
}

export interface NukeCollisionResult {
  asteroidsHit: Asteroid[];
  barriersHit: Barrier[];
  shipsHit: Ship[];
  enemyProjectilesHit: EnemyProjectile[];
  bossHit: boolean;
  bossChunk?: number;
}

/**
 * Check projectile vs asteroid collision with damage calculation
 */
export const checkProjectileAsteroidCollision = (
  projectile: Projectile,
  asteroid: Asteroid,
  weapon: WeaponConfig
): CollisionResult => {
  const dx = asteroid.x - projectile.x;
  const dy = asteroid.y - projectile.y;
  const rr = asteroid.r + projectile.r;

  if (dx * dx + dy * dy > rr * rr) {
    return { hit: false };
  }

  // Calculate damage based on weapon type and level
  let damage = 1;
  if (projectile.kind === "laser") damage = 2 + weapon.level;
  else if (projectile.kind === "homing") damage = 3 + weapon.level;
  else if (projectile.kind === "fire") damage = 1 + weapon.level;
  else damage = 1;

  return {
    hit: true,
    damage,
    removeProjectile: projectile.kind !== "laser" || (projectile as any).pierce <= 1,
    removeTarget: asteroid.hp <= damage
  };
};

/**
 * Check projectile vs barrier collision with damage calculation
 */
export const checkProjectileBarrierCollision = (
  projectile: Projectile,
  barrier: Barrier,
  weapon: WeaponConfig
): CollisionResult => {
  const cx = clamp(projectile.x, barrier.x, barrier.x + barrier.w);
  const cy = clamp(projectile.y, barrier.y, barrier.y + barrier.h);
  const dx = projectile.x - cx;
  const dy = projectile.y - cy;

  if (dx * dx + dy * dy > projectile.r * projectile.r) {
    return { hit: false };
  }

  // Calculate damage
  let damage = 1;
  if (projectile.kind === "laser") damage = 2 + weapon.level;
  else if (projectile.kind === "homing") damage = 2 + (weapon.level - 1);
  else if (projectile.kind === "fire") damage = 1 + weapon.level;
  else damage = 1;

  return {
    hit: true,
    damage,
    removeProjectile: projectile.kind !== "laser" || (projectile as any).pierce <= 1,
    removeTarget: barrier.hp <= damage
  };
};

/**
 * Check projectile vs ship collision with damage calculation
 */
export const checkProjectileShipCollision = (
  projectile: Projectile,
  ship: Ship,
  weapon: WeaponConfig
): CollisionResult => {
  const dx = projectile.x - ship.x;
  const dy = projectile.y - ship.y;
  const rad = projectile.r + 12; // Ship collision radius

  if (dx * dx + dy * dy > rad * rad) {
    return { hit: false };
  }

  // Weapon-scaled damage
  let damage = 1;
  if (projectile.kind === "laser") damage = 3 + 2 * (weapon.level - 1);
  else if (projectile.kind === "homing") damage = 3 + (weapon.level - 1);
  else if (projectile.kind === "fire") damage = 2 + (weapon.level - 1);
  else damage = 1 + (weapon.level - 1);

  return {
    hit: true,
    damage,
    removeProjectile: projectile.kind !== "laser" || (projectile as any).pierce <= 1,
    removeTarget: ship.hp <= damage
  };
};

/**
 * Check projectile vs boss collision with damage calculation
 */
export const checkProjectileBossCollision = (
  projectile: Projectile,
  boss: Boss,
  weapon: WeaponConfig,
  constants: GameConstants
): CollisionResult => {
  if (!boss.active) return { hit: false };

  const dx = projectile.x - boss.x;
  const dy = projectile.y - boss.y;
  const rad = constants.BOSS_COLLISION_RADIUS;

  if (dx * dx + dy * dy > rad * rad) {
    return { hit: false };
  }

  let damage = 1;
  if (projectile.kind === "laser") damage = 4 + 2 * (weapon.level - 1);
  else if (projectile.kind === "homing") damage = 3 + (weapon.level - 1);
  else if (projectile.kind === "fire") damage = 2 + (weapon.level - 1);
  else damage = 1 + (weapon.level - 1);

  return {
    hit: true,
    damage,
    removeProjectile: projectile.kind !== "laser" || (projectile as any).pierce <= 1,
    removeTarget: boss.hp <= damage
  };
};

/**
 * Check pod vs asteroid collision
 */
export const checkPodAsteroidCollision = (
  podX: number,
  podY: number,
  asteroid: Asteroid,
  constants: GameConstants
): boolean => {
  const dx = asteroid.x - podX;
  const dy = asteroid.y - podY;
  const rr = asteroid.r + constants.POD_RADIUS;
  return dx * dx + dy * dy <= rr * rr;
};

/**
 * Check pod vs barrier collision
 */
export const checkPodBarrierCollision = (
  podX: number,
  podY: number,
  barrier: Barrier,
  constants: GameConstants
): boolean => {
  const cx = clamp(podX, barrier.x, barrier.x + barrier.w);
  const cy = clamp(podY, barrier.y, barrier.y + barrier.h);
  const dx = podX - cx;
  const dy = podY - cy;
  return dx * dx + dy * dy <= constants.POD_RADIUS * constants.POD_RADIUS;
};

/**
 * Check pod vs ship collision
 */
export const checkPodShipCollision = (
  podX: number,
  podY: number,
  ship: Ship,
  constants: GameConstants
): boolean => {
  const dx = ship.x - podX;
  const dy = ship.y - podY;
  const rr = constants.POD_RADIUS + 14; // Ship collision radius
  return dx * dx + dy * dy <= rr * rr;
};

/**
 * Check pod vs enemy projectile collision
 */
export const checkPodEnemyProjectileCollision = (
  podX: number,
  podY: number,
  enemyProjectile: EnemyProjectile,
  constants: GameConstants
): boolean => {
  const dx = enemyProjectile.x - podX;
  const dy = enemyProjectile.y - podY;
  const rr = enemyProjectile.r + constants.POD_RADIUS;
  return dx * dx + dy * dy <= rr * rr;
};

/**
 * Check pod vs power-up collision
 */
export const checkPodPowerUpCollision = (
  podX: number,
  podY: number,
  powerUp: PowerUp,
  constants: GameConstants
): boolean => {
  const dx = podX - powerUp.x;
  const dy = podY - powerUp.y;
  const rr = constants.POD_RADIUS + 16; // Power-up collision radius
  return dx * dx + dy * dy <= rr * rr;
};

/**
 * Check drone vs enemy projectile collision
 */
export const checkDroneEnemyProjectileCollision = (
  drone: Drone,
  enemyProjectile: EnemyProjectile
): boolean => {
  if (!drone.active) return false;

  const dx = enemyProjectile.x - drone.x;
  const dy = enemyProjectile.y - drone.y;
  const rr = enemyProjectile.r + 8; // Drone hitbox
  return dx * dx + dy * dy <= rr * rr;
};

/**
 * Check drone vs ship collision (kamikaze attack)
 */
export const checkDroneShipCollision = (
  drone: Drone,
  ship: Ship,
  scrollY: number
): boolean => {
  if (!drone.active) return false;

  const shipScreenY = ship.y - scrollY;
  const dx = drone.x - ship.x;
  const dy = drone.y - shipScreenY;
  const rr = 20; // Drone hit radius - larger for easier hits
  return dx * dx + dy * dy <= rr * rr;
};

/**
 * Check ring collision with pod
 */
export const checkRingCollision = (
  podX: number,
  podY: number,
  ringX: number,
  ringY: number,
  ringRadius: number,
  constants: GameConstants
): boolean => {
  const dxRing = podX - ringX;
  const dyRing = podY - ringY;
  const distanceToCenter = Math.sqrt(dxRing * dxRing + dyRing * dyRing);

  // Check if pod is touching the ring edge (within pod radius of the ring border)
  return Math.abs(distanceToCenter - ringRadius) <= constants.POD_RADIUS;
};

/**
 * Comprehensive nuke collision detection
 */
export const checkNukeCollisions = (
  nukeX: number,
  nukeY: number,
  nukeRadius: number,
  asteroids: Asteroid[],
  barriers: Barrier[],
  ships: Ship[],
  enemyProjectiles: EnemyProjectile[],
  boss: Boss,
  constants: GameConstants
): NukeCollisionResult => {
  const result: NukeCollisionResult = {
    asteroidsHit: [],
    barriersHit: [],
    shipsHit: [],
    enemyProjectilesHit: [],
    bossHit: false
  };

  // Check asteroids
  for (const asteroid of asteroids) {
    const dx = asteroid.x - nukeX;
    const dy = asteroid.y - nukeY;
    if (dx * dx + dy * dy <= (nukeRadius + asteroid.r) * (nukeRadius + asteroid.r)) {
      result.asteroidsHit.push(asteroid);
    }
  }

  // Check barriers
  for (const barrier of barriers) {
    const bx = clamp(nukeX, barrier.x, barrier.x + barrier.w);
    const by = clamp(nukeY, barrier.y, barrier.y + barrier.h);
    const dx = bx - nukeX;
    const dy = by - nukeY;
    if (dx * dx + dy * dy <= nukeRadius * nukeRadius) {
      result.barriersHit.push(barrier);
    }
  }

  // Check ships
  for (const ship of ships) {
    const dx = ship.x - nukeX;
    const dy = ship.y - nukeY;
    if (dx * dx + dy * dy <= (nukeRadius + 14) * (nukeRadius + 14)) {
      result.shipsHit.push(ship);
    }
  }

  // Check enemy projectiles
  for (const proj of enemyProjectiles) {
    const dx = proj.x - nukeX;
    const dy = proj.y - nukeY;
    if (dx * dx + dy * dy <= (nukeRadius + proj.r) * (nukeRadius + proj.r)) {
      result.enemyProjectilesHit.push(proj);
    }
  }

  // Check boss
  if (boss.active) {
    const dx = boss.x - nukeX;
    const dy = boss.y - nukeY;
    const br = constants.BOSS_COLLISION_RADIUS;
    if (dx * dx + dy * dy <= (nukeRadius + br) * (nukeRadius + br)) {
      result.bossHit = true;
      result.bossChunk = Math.max(1, Math.floor(boss.hpMax * 0.25));
    }
  }

  return result;
};