// Weapon system management
import { EntityManager, Projectile } from './EntityManager';

export type WeaponType = 'basic' | 'multi' | 'spread' | 'laser' | 'fire' | 'homing';

export interface WeaponConfig {
  damage: number;
  cooldown: number;
  projectileSpeed: number;
  projectileCount: number;
  spread: number;
  color: string;
  sound: string;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  basic: {
    damage: 1,
    cooldown: 0.22,
    projectileSpeed: 900,
    projectileCount: 1,
    spread: 0,
    color: '#FFE486',
    sound: 'weapon',
  },
  multi: {
    damage: 1,
    cooldown: 0.16,
    projectileSpeed: 850,
    projectileCount: 3,
    spread: 0.3,
    color: '#FFB46B',
    sound: 'multi',
  },
  spread: {
    damage: 1,
    cooldown: 0.32,
    projectileSpeed: 800,
    projectileCount: 5,
    spread: 0.8,
    color: '#FF8A80',
    sound: 'spread',
  },
  laser: {
    damage: 2,
    cooldown: 0.35,
    projectileSpeed: 1250,
    projectileCount: 1,
    spread: 0,
    color: '#B1E1FF',
    sound: 'laser',
  },
  fire: {
    damage: 1,
    cooldown: 0.20,
    projectileSpeed: 800,
    projectileCount: 1,
    spread: 0.1,
    color: '#FFB46B',
    sound: 'fire',
  },
  homing: {
    damage: 2,
    cooldown: 0.45,
    projectileSpeed: 720,
    projectileCount: 1,
    spread: 0,
    color: '#E1BEE7',
    sound: 'homing',
  },
};

export interface WeaponUpgrade {
  type: WeaponType;
  level: number;
  maxLevel: number;
}

export class WeaponSystem {
  private currentWeapon: WeaponType = 'basic';
  private weaponLevels: Map<WeaponType, number> = new Map();
  private lastFireTime: number = 0;
  private isRapidFire: boolean = false;
  private rapidFireEndTime: number = 0;

  constructor() {
    // Initialize all weapons at level 0
    Object.keys(WEAPON_CONFIGS).forEach(weapon => {
      this.weaponLevels.set(weapon as WeaponType, 0);
    });
    this.weaponLevels.set('basic', 1); // Start with basic weapon
  }

  getCurrentWeapon(): WeaponType {
    return this.currentWeapon;
  }

  setCurrentWeapon(weapon: WeaponType): void {
    if (this.hasWeapon(weapon)) {
      this.currentWeapon = weapon;
    }
  }

  hasWeapon(weapon: WeaponType): boolean {
    return (this.weaponLevels.get(weapon) || 0) > 0;
  }

  getWeaponLevel(weapon: WeaponType): number {
    return this.weaponLevels.get(weapon) || 0;
  }

  upgradeWeapon(weapon: WeaponType): boolean {
    const currentLevel = this.weaponLevels.get(weapon) || 0;
    const maxLevel = 5; // Max weapon level

    if (currentLevel < maxLevel) {
      this.weaponLevels.set(weapon, currentLevel + 1);

      // Auto-switch to new weapon if it's better
      if (weapon !== 'basic' && currentLevel === 0) {
        this.currentWeapon = weapon;
      }

      return true;
    }
    return false;
  }

  canFire(currentTime: number): boolean {
    const config = WEAPON_CONFIGS[this.currentWeapon];
    const cooldown = this.isRapidFire ? config.cooldown * 0.14 : config.cooldown;

    return currentTime - this.lastFireTime >= cooldown;
  }

  fire(
    x: number,
    y: number,
    currentTime: number,
    entities: EntityManager,
    targetX?: number,
    targetY?: number
  ): Projectile[] {
    if (!this.canFire(currentTime)) return [];

    this.lastFireTime = currentTime;
    const config = WEAPON_CONFIGS[this.currentWeapon];
    const level = this.weaponLevels.get(this.currentWeapon) || 1;
    const projectiles: Projectile[] = [];

    // Calculate damage with level scaling
    const damage = config.damage + Math.floor(level / 2);

    for (let i = 0; i < config.projectileCount; i++) {
      let angle = -Math.PI / 2; // Straight up

      // Apply spread for multi-projectile weapons
      if (config.projectileCount > 1) {
        const spreadStep = config.spread / (config.projectileCount - 1);
        angle += (i * spreadStep) - (config.spread / 2);
      }

      // Special handling for homing projectiles
      if (this.currentWeapon === 'homing' && targetX !== undefined && targetY !== undefined) {
        angle = Math.atan2(targetY - y, targetX - x);
      }

      const vx = Math.cos(angle) * config.projectileSpeed;
      const vy = Math.sin(angle) * config.projectileSpeed;

      const projectile = entities.createProjectile(
        x + (i - config.projectileCount / 2) * 8, // Slight offset for multiple projectiles
        y,
        vx,
        vy,
        damage,
        this.currentWeapon
      );

      projectiles.push(projectile);
      entities.addEntity('projectiles', projectile);
    }

    return projectiles;
  }

  activateRapidFire(duration: number = 5.0, currentTime: number): void {
    this.isRapidFire = true;
    this.rapidFireEndTime = currentTime + duration;
  }

  update(currentTime: number): void {
    // Check if rapid fire has expired
    if (this.isRapidFire && currentTime >= this.rapidFireEndTime) {
      this.isRapidFire = false;
    }
  }

  isRapidFireActive(): boolean {
    return this.isRapidFire;
  }

  getRapidFireTimeRemaining(currentTime: number): number {
    if (!this.isRapidFire) return 0;
    return Math.max(0, this.rapidFireEndTime - currentTime);
  }

  // Get weapon info for UI
  getWeaponInfo(): {
    type: WeaponType;
    level: number;
    maxLevel: number;
    damage: number;
    cooldown: number;
    isRapidFire: boolean;
  } {
    const config = WEAPON_CONFIGS[this.currentWeapon];
    const level = this.weaponLevels.get(this.currentWeapon) || 1;

    return {
      type: this.currentWeapon,
      level,
      maxLevel: 5,
      damage: config.damage + Math.floor(level / 2),
      cooldown: this.isRapidFire ? config.cooldown * 0.14 : config.cooldown,
      isRapidFire: this.isRapidFire,
    };
  }

  // Reset weapon system
  reset(): void {
    this.currentWeapon = 'basic';
    this.weaponLevels.clear();

    // Reset to basic weapon only
    Object.keys(WEAPON_CONFIGS).forEach(weapon => {
      this.weaponLevels.set(weapon as WeaponType, 0);
    });
    this.weaponLevels.set('basic', 1);

    this.lastFireTime = 0;
    this.isRapidFire = false;
    this.rapidFireEndTime = 0;
  }

  // Get all available weapons for UI
  getAvailableWeapons(): WeaponUpgrade[] {
    return Object.keys(WEAPON_CONFIGS)
      .filter(weapon => this.hasWeapon(weapon as WeaponType))
      .map(weapon => ({
        type: weapon as WeaponType,
        level: this.weaponLevels.get(weapon as WeaponType) || 0,
        maxLevel: 5,
      }));
  }

  // Auto-target finding for homing weapons
  findBestTarget(
    playerX: number,
    playerY: number,
    entities: EntityManager,
    maxRange: number = 300
  ): { x: number; y: number } | null {
    if (this.currentWeapon !== 'homing') return null;

    // Prioritize ships over asteroids
    let target = entities.getClosestEntity('ships', playerX, playerY, maxRange);
    if (!target) {
      target = entities.getClosestEntity('asteroids', playerX, playerY, maxRange);
    }

    return target ? { x: target.x, y: target.y } : null;
  }
}