/**
 * Animation and screen effects system
 * Handles screen shake, flash effects, and other visual animations
 */

import { MutableRefObject } from 'react';

export interface AnimationState {
  shakeT: MutableRefObject<number>;
  shakeMag: MutableRefObject<number>;
  flashTime: MutableRefObject<number>;
  crashFlashTime: MutableRefObject<number>;
}

/**
 * Update all animation timers
 */
export const updateAnimations = (state: AnimationState, dt: number): void => {
  // Update flash effects
  if (state.flashTime.current > 0) {
    state.flashTime.current = Math.max(0, state.flashTime.current - dt);
  }

  if (state.crashFlashTime.current > 0) {
    state.crashFlashTime.current = Math.max(0, state.crashFlashTime.current - dt);
  }

  // Update screen shake with decay
  if (state.shakeT.current > 0) {
    state.shakeT.current = Math.max(0, state.shakeT.current - dt);
    state.shakeMag.current *= 0.9; // Gradual magnitude decay
  }
};

/**
 * Apply screen shake effect
 */
export const addScreenShake = (
  state: AnimationState,
  duration: number,
  magnitude: number
): void => {
  state.shakeT.current = Math.max(state.shakeT.current, duration);
  state.shakeMag.current = Math.max(state.shakeMag.current, magnitude);
};

/**
 * Apply flash effect
 */
export const addFlashEffect = (
  state: AnimationState,
  duration: number,
  isCrashFlash: boolean = false
): void => {
  if (isCrashFlash) {
    state.crashFlashTime.current = Math.max(state.crashFlashTime.current, duration);
  } else {
    state.flashTime.current = Math.max(state.flashTime.current, duration);
  }
};

/**
 * Get current screen shake offset
 */
export const getShakeOffset = (state: AnimationState): { x: number; y: number } => {
  if (state.shakeT.current <= 0) {
    return { x: 0, y: 0 };
  }

  const intensity = state.shakeMag.current;
  return {
    x: (Math.random() - 0.5) * intensity * 2,
    y: (Math.random() - 0.5) * intensity * 2
  };
};

/**
 * Reset all animation states
 */
export const resetAnimations = (state: AnimationState): void => {
  state.shakeT.current = 0;
  state.shakeMag.current = 0;
  state.flashTime.current = 0;
  state.crashFlashTime.current = 0;
};

/**
 * Weapon-specific screen shake presets
 */
export const SHAKE_PRESETS = {
  // Weapon firing shakes
  WEAPON_L1: { duration: 0.1, magnitude: 2.0 },
  WEAPON_L2: { duration: 0.15, magnitude: 4.0 },
  WEAPON_L3: { duration: 0.2, magnitude: 6.0 },

  // Explosion shakes
  NUKE_EXPLOSION: { duration: 0.3, magnitude: 6.0 },
  SHIP_EXPLOSION: { duration: 0.2, magnitude: 4.0 },
  ASTEROID_HIT: { duration: 0.1, magnitude: 2.0 },

  // Game event shakes
  POD_DEATH: { duration: 0.4, magnitude: 8.0 },
  BOSS_DEFEAT: { duration: 0.5, magnitude: 10.0 },
  RING_COLLISION: { duration: 0.15, magnitude: 3.0 }
} as const;

/**
 * Apply weapon-specific screen shake
 */
export const addWeaponShake = (
  state: AnimationState,
  weaponLevel: number
): void => {
  const presets = [
    SHAKE_PRESETS.WEAPON_L1,
    SHAKE_PRESETS.WEAPON_L2,
    SHAKE_PRESETS.WEAPON_L3
  ];

  const preset = presets[Math.min(weaponLevel - 1, presets.length - 1)] || SHAKE_PRESETS.WEAPON_L1;
  addScreenShake(state, preset.duration, preset.magnitude);
};

/**
 * Apply explosion-based screen shake
 */
export const addExplosionShake = (
  state: AnimationState,
  explosionType: 'nuke' | 'ship' | 'asteroid' | 'boss'
): void => {
  const presetMap = {
    nuke: SHAKE_PRESETS.NUKE_EXPLOSION,
    ship: SHAKE_PRESETS.SHIP_EXPLOSION,
    asteroid: SHAKE_PRESETS.ASTEROID_HIT,
    boss: SHAKE_PRESETS.BOSS_DEFEAT
  };

  const preset = presetMap[explosionType];
  addScreenShake(state, preset.duration, preset.magnitude);
};