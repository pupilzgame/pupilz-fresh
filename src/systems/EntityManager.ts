// Entity management system for game objects

export interface GameEntity {
  id: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  r?: number;
  w?: number;
  h?: number;
  health?: number;
  type: string;
  lastHit?: number;
}

export interface Asteroid extends GameEntity {
  r: number;
  vx: number;
  vy: number;
  type: 'small' | 'medium' | 'large';
}

export interface Ship extends GameEntity {
  r: number;
  vx: number;
  vy: number;
  health: number;
  type: 'standard' | 'heavy' | 'fast';
}

export interface Barrier extends GameEntity {
  w: number;
  h: number;
  vx: number;
  vy: number;
  health: number;
}

export interface Projectile extends GameEntity {
  r: number;
  vx: number;
  vy: number;
  damage: number;
  ttl: number;
  kind: 'basic' | 'laser' | 'fire' | 'multi' | 'spread' | 'homing';
}

export interface PowerUp extends GameEntity {
  r: number;
  vy: number;
  kind: 'weapon' | 'shield' | 'drone' | 'nuke' | 'energy' | 'rapid' | 'time-slow';
  weaponType?: string;
}

export interface Boss extends GameEntity {
  r: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  active: boolean;
  lastFire: number;
}

export interface Drone extends GameEntity {
  r: number;
  angle: number;
  orbitRadius: number;
  targetX?: number;
  targetY?: number;
  kamikazeMode: boolean;
}

export class EntityManager {
  private nextId: number = 1;
  private entities: Map<string, GameEntity[]> = new Map();

  constructor() {
    this.entities.set('asteroids', []);
    this.entities.set('ships', []);
    this.entities.set('barriers', []);
    this.entities.set('projectiles', []);
    this.entities.set('powerups', []);
    this.entities.set('drones', []);
    this.entities.set('boss', []);
  }

  getNextId(): number {
    return this.nextId++;
  }

  addEntity(category: string, entity: GameEntity): void {
    if (!this.entities.has(category)) {
      this.entities.set(category, []);
    }
    entity.id = this.getNextId();
    this.entities.get(category)!.push(entity);
  }

  getEntities(category: string): GameEntity[] {
    return this.entities.get(category) || [];
  }

  removeEntity(category: string, id: number): boolean {
    const entities = this.entities.get(category);
    if (!entities) return false;

    const index = entities.findIndex(e => e.id === id);
    if (index !== -1) {
      entities.splice(index, 1);
      return true;
    }
    return false;
  }

  clearCategory(category: string): void {
    const entities = this.entities.get(category);
    if (entities) {
      entities.length = 0;
    }
  }

  updateEntities(category: string, deltaTime: number, worldBounds: { width: number; height: number }): void {
    const entities = this.entities.get(category);
    if (!entities) return;

    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];

      // Update position
      if (entity.vx !== undefined) entity.x += entity.vx * deltaTime;
      if (entity.vy !== undefined) entity.y += entity.vy * deltaTime;

      // Update TTL for projectiles
      if ('ttl' in entity && entity.ttl !== undefined) {
        (entity as any).ttl -= deltaTime;
        if ((entity as any).ttl <= 0) {
          entities.splice(i, 1);
          continue;
        }
      }

      // Remove entities that are off-screen
      if (this.isOffScreen(entity, worldBounds)) {
        entities.splice(i, 1);
        continue;
      }
    }
  }

  private isOffScreen(entity: GameEntity, bounds: { width: number; height: number }): boolean {
    const margin = 100; // Allow entities to go slightly off-screen
    const radius = entity.r || Math.max(entity.w || 0, entity.h || 0) / 2;

    return (
      entity.x < -margin - radius ||
      entity.x > bounds.width + margin + radius ||
      entity.y < -margin - radius ||
      entity.y > bounds.height + margin + radius
    );
  }

  findEntitiesInRadius(
    category: string,
    centerX: number,
    centerY: number,
    radius: number
  ): GameEntity[] {
    const entities = this.entities.get(category) || [];
    return entities.filter(entity => {
      const dx = entity.x - centerX;
      const dy = entity.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const entityRadius = entity.r || Math.max(entity.w || 0, entity.h || 0) / 2;
      return distance <= radius + entityRadius;
    });
  }

  getClosestEntity(
    category: string,
    x: number,
    y: number,
    maxDistance: number = Infinity
  ): GameEntity | null {
    const entities = this.entities.get(category) || [];
    let closest: GameEntity | null = null;
    let closestDistance = maxDistance;

    for (const entity of entities) {
      const dx = entity.x - x;
      const dy = entity.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closest = entity;
        closestDistance = distance;
      }
    }

    return closest;
  }

  getEntityCount(category: string): number {
    return this.entities.get(category)?.length || 0;
  }

  getAllEntities(): Map<string, GameEntity[]> {
    return this.entities;
  }

  reset(): void {
    for (const [category, entities] of this.entities) {
      entities.length = 0;
    }
    this.nextId = 1;
  }

  // Utility functions for specific entity types
  createAsteroid(x: number, y: number, vx: number, vy: number, r: number, type: 'small' | 'medium' | 'large'): Asteroid {
    return {
      id: 0, // Will be set by addEntity
      x, y, vx, vy, r, type,
      health: type === 'small' ? 1 : type === 'medium' ? 2 : 3,
    };
  }

  createProjectile(x: number, y: number, vx: number, vy: number, damage: number, kind: Projectile['kind']): Projectile {
    return {
      id: 0, // Will be set by addEntity
      x, y, vx, vy,
      r: 3,
      damage,
      ttl: 3.0, // 3 seconds
      kind,
      type: 'projectile',
    };
  }

  createPowerUp(x: number, y: number, kind: PowerUp['kind'], weaponType?: string): PowerUp {
    return {
      id: 0, // Will be set by addEntity
      x, y,
      r: 12,
      vy: 50, // Slow drift down
      vx: 0,
      kind,
      weaponType,
      type: 'powerup',
    };
  }
}