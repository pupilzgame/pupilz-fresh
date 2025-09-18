/**
 * Enemy type configurations
 * Asteroid and barrier type definitions with their properties
 */

export type AsteroidType = "rock" | "metal" | "crystal" | "debris" | "wreckage";
export type BarrierType = "metal" | "energy" | "asteroid" | "debris";

export interface AsteroidTypeData {
  hpMult: number;
  sizeMult: number;
  speedMult: number;
  color: string;
  border: string;
  damageColor: string;
}

export interface BarrierTypeData {
  hpMult: number;
  color: string;
  border: string;
  height: number;
}

export const ASTEROID_TYPE_CONFIGS: Record<AsteroidType, AsteroidTypeData> = {
  rock: {
    hpMult: 1.0,
    sizeMult: 1.0,
    speedMult: 1.0,
    color: "#7E8799",
    border: "#3E4654",
    damageColor: "#B91C1C"
  },
  metal: {
    hpMult: 2.0,
    sizeMult: 0.8,
    speedMult: 0.7,
    color: "#9BACC7",
    border: "#4A5568",
    damageColor: "#DC2626"
  },
  crystal: {
    hpMult: 0.6,
    sizeMult: 1.2,
    speedMult: 1.3,
    color: "#A78BFA",
    border: "#6D28D9",
    damageColor: "#EF4444"
  },
  debris: {
    hpMult: 0.4,
    sizeMult: 0.6,
    speedMult: 1.5,
    color: "#DC8B47",
    border: "#8B4513",
    damageColor: "#F87171"
  },
  wreckage: {
    hpMult: 1.5,
    sizeMult: 1.4,
    speedMult: 0.6,
    color: "#6B7280",
    border: "#374151",
    damageColor: "#B91C1C"
  }
};

export const BARRIER_TYPE_CONFIGS: Record<BarrierType, BarrierTypeData> = {
  metal: {
    hpMult: 1.5,
    color: "#C04E4E",
    border: "#7A2F2F",
    height: 16 // GameConfig.BAR_H base value
  },
  energy: {
    hpMult: 1.0,
    color: "#9333EA",
    border: "#5B21B6",
    height: 19.2 // GameConfig.BAR_H * 1.2
  },
  asteroid: {
    hpMult: 2.0,
    color: "#78716C",
    border: "#44403C",
    height: 12.8 // GameConfig.BAR_H * 0.8
  },
  debris: {
    hpMult: 0.8,
    color: "#EA580C",
    border: "#C2410C",
    height: 9.6 // GameConfig.BAR_H * 0.6
  }
};

export const getAsteroidTypeData = (type: AsteroidType): AsteroidTypeData => {
  return ASTEROID_TYPE_CONFIGS[type];
};

export const getBarrierTypeData = (type: BarrierType): BarrierTypeData => {
  return BARRIER_TYPE_CONFIGS[type];
};

export const AVAILABLE_BARRIER_TYPES: BarrierType[] = ["metal", "energy", "asteroid", "debris"];