/**
 * Particle system for visual effects
 * Handles particle creation, updating, and management
 */

import { MutableRefObject } from 'react';
import { rand } from '../utils/math';
import { COLORS } from '../config/colors';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ttl: number;
  color: string;
}

export interface ParticleContainer {
  current: Particle[];
}

/**
 * Update all particles - position, velocity decay, and cleanup
 */
export const updateParticles = (
  particles: ParticleContainer,
  dt: number,
  enemyDt: number,
  scrollY: number
): void => {
  for (let i = particles.current.length - 1; i >= 0; i--) {
    const pa = particles.current[i];
    pa.ttl -= dt;
    pa.x += pa.vx * enemyDt;
    pa.y += pa.vy * enemyDt;
    pa.vx *= 0.98; // velocity decay
    pa.vy *= 0.98;

    // Remove expired or off-screen particles
    if (pa.ttl <= 0 || pa.y - scrollY < -80) {
      particles.current.splice(i, 1);
    }
  }
};

/**
 * Create burst particles for various effects
 */
export const createBurstParticles = (
  particles: ParticleContainer,
  centerX: number,
  centerY: number,
  count: number,
  colors: string[],
  options: {
    speedMin?: number;
    speedMax?: number;
    sizeMin?: number;
    sizeMax?: number;
    ttlMin?: number;
    ttlMax?: number;
  } = {}
): void => {
  const {
    speedMin = 90,
    speedMax = 180,
    sizeMin = 2.0,
    sizeMax = 3.2,
    ttlMin = 0.35,
    ttlMax = 0.65
  } = options;

  const idBase = (particles.current[particles.current.length - 1]?.id ?? 0) + 1;

  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = rand(speedMin, speedMax);
    const color = colors[i % colors.length];

    particles.current.push({
      id: idBase + i,
      x: centerX,
      y: centerY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: rand(sizeMin, sizeMax),
      ttl: rand(ttlMin, ttlMax),
      color
    });
  }
};

/**
 * Create energy sparkles (for pickups, power-ups)
 */
export const createEnergySparkles = (
  particles: ParticleContainer,
  centerX: number,
  centerY: number
): void => {
  const colors = [
    COLORS.EFFECT.ENERGY_TRAIL_1,
    COLORS.EFFECT.ENERGY_TRAIL_2,
    COLORS.EFFECT.ENERGY_TRAIL_3
  ];

  createBurstParticles(particles, centerX, centerY, 16, colors);
};

/**
 * Create explosion particles with specific colors
 */
export const createExplosionParticles = (
  particles: ParticleContainer,
  centerX: number,
  centerY: number,
  explosionColors: string[],
  count: number = 12
): void => {
  createBurstParticles(particles, centerX, centerY, count, explosionColors, {
    speedMin: 60,
    speedMax: 140,
    sizeMin: 1.8,
    sizeMax: 2.8,
    ttlMin: 0.4,
    ttlMax: 0.8
  });
};

/**
 * Create debris particles for destruction effects
 */
export const createDebrisParticles = (
  particles: ParticleContainer,
  centerX: number,
  centerY: number,
  debrisColor: string,
  count: number = 8
): void => {
  createBurstParticles(particles, centerX, centerY, count, [debrisColor], {
    speedMin: 40,
    speedMax: 100,
    sizeMin: 1.5,
    sizeMax: 2.5,
    ttlMin: 0.6,
    ttlMax: 1.0
  });
};

/**
 * Create power-based explosion (replaces boom function)
 */
export const createPowerExplosion = (
  particles: ParticleContainer,
  x: number,
  y: number,
  power: number,
  color: string
): void => {
  const idBase = (particles.current[particles.current.length - 1]?.id ?? 0) + 1;
  const count = Math.floor(8 + power * 6);

  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = rand(80, 220) * (0.8 + power * 0.4);
    particles.current.push({
      id: idBase + i,
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd + 40,
      r: rand(2.5, 4.5),
      ttl: 0.45 + Math.random() * 0.35,
      color,
    });
  }
};

/**
 * Create pod death particles (megaman-style pop)
 */
export const createPodDeathParticles = (
  particles: ParticleContainer,
  x: number,
  y: number
): void => {
  const idBase = (particles.current[particles.current.length - 1]?.id ?? 0) + 1;

  for (let i = 0; i < 24; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = rand(130, 260);
    particles.current.push({
      id: idBase + i,
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: rand(2.2, 3.5),
      ttl: rand(0.5, 0.9),
      color: i % 3 === 0 ? COLORS.EFFECT.PROJECTILE_1 : i % 3 === 1 ? COLORS.EFFECT.PROJECTILE_2 : COLORS.EFFECT.PROJECTILE_3,
    });
  }
};

/**
 * Create ring impact particles
 */
export const createRingImpactParticles = (
  particles: ParticleContainer,
  ringX: number,
  ringY: number,
  particleCount: number = 8
): void => {
  const idBase = (particles.current[particles.current.length - 1]?.id ?? 0) + 1;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const speed = rand(120, 200);
    const outwardAngle = angle + rand(-0.3, 0.3);

    particles.current.push({
      id: idBase + i,
      x: ringX,
      y: ringY,
      vx: Math.cos(outwardAngle) * speed,
      vy: Math.sin(outwardAngle) * speed,
      r: rand(2.0, 3.0),
      ttl: rand(0.5, 0.8),
      color: COLORS.EFFECT.ENERGY_TRAIL_2
    });
  }
};

/**
 * Create confetti particles for celebration
 */
export const createConfettiParticles = (
  particles: ParticleContainer,
  x: number,
  y: number,
  count: number = 10
): void => {
  const confettiColors = [
    '#FFD700', '#FF6347', '#32CD32', '#1E90FF',
    '#FF69B4', '#FFA500', '#9370DB', '#20B2AA'
  ];

  createBurstParticles(particles, x, y, count, confettiColors, {
    speedMin: 100,
    speedMax: 300,
    sizeMin: 3.0,
    sizeMax: 5.0,
    ttlMin: 1.0,
    ttlMax: 2.0
  });
};

/**
 * Create firework burst particles
 */
export const createFireworkBurst = (
  particles: ParticleContainer,
  centerX: number,
  centerY: number,
  burstCount: number = 25
): void => {
  const sparkleColors = [
    '#FFD700', '#FF6347', '#32CD32', '#1E90FF',
    '#FF69B4', '#FFA500', '#9370DB', '#20B2AA'
  ];

  const idBase = (particles.current[particles.current.length - 1]?.id ?? 0) + 1;

  for (let i = 0; i < burstCount; i++) {
    const sparkleAngle = Math.random() * Math.PI * 2;
    const sparkleSpeed = rand(80, 200);
    const color = sparkleColors[i % sparkleColors.length];

    particles.current.push({
      id: idBase + i,
      x: centerX,
      y: centerY,
      vx: Math.cos(sparkleAngle) * sparkleSpeed,
      vy: Math.sin(sparkleAngle) * sparkleSpeed,
      r: rand(2.0, 4.0),
      ttl: rand(0.8, 1.5),
      color
    });
  }
};

/**
 * Clear all particles
 */
export const clearParticles = (particles: ParticleContainer): void => {
  particles.current = [];
};