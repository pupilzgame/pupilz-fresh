import React, { useRef } from 'react';
import { View } from 'react-native';
import { rand } from '../../utils/math';

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

export interface ParticleSystemProps {
  particles: React.MutableRefObject<Particle[]>;
  width: number;
  height: number;
  scrollY: number;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  particles,
  width,
  height,
  scrollY,
}) => {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {particles.current.map((p) => {
        const screenY = p.y - scrollY;
        if (screenY < -50 || screenY > height + 50) return null;
        if (p.x < -50 || p.x > width + 50) return null;

        return (
          <View
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x - p.r,
              top: screenY - p.r,
              width: p.r * 2,
              height: p.r * 2,
              backgroundColor: p.color,
              borderRadius: p.r,
              opacity: Math.min(1, p.ttl),
            }}
          />
        );
      })}
    </View>
  );
};

// Particle management utilities
export const createExplosion = (
  particles: React.MutableRefObject<Particle[]>,
  x: number,
  y: number,
  power: number,
  color: string,
  nextId: () => number
): void => {
  const count = Math.floor(8 + power * 6);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(80, 220) * (0.8 + power * 0.4);
    particles.current.push({
      id: nextId(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 40,
      r: rand(2.5, 4.5),
      ttl: 0.45 + Math.random() * 0.35,
      color,
    });
  }
};

export const createHitEffect = (
  particles: React.MutableRefObject<Particle[]>,
  x: number,
  y: number,
  damage: number,
  color: string,
  nextId: () => number
): void => {
  const count = Math.min(2 + damage, 5);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(60, 120);
    particles.current.push({
      id: nextId(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(1.5, 2.5),
      ttl: rand(0.2, 0.4),
      color,
    });
  }
};

export const createRingDisintegration = (
  particles: React.MutableRefObject<Particle[]>,
  centerX: number,
  centerY: number,
  radius: number,
  color: string,
  nextId: () => number
): void => {
  const particleCount = Math.min(Math.floor(radius * 0.3), 20);

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const ringX = centerX + Math.cos(angle) * radius;
    const ringY = centerY + Math.sin(angle) * radius;

    const speed = rand(120, 300);
    const outwardAngle = angle + rand(-0.3, 0.3);

    particles.current.push({
      id: nextId(),
      x: ringX,
      y: ringY,
      vx: Math.cos(outwardAngle) * speed,
      vy: Math.sin(outwardAngle) * speed,
      r: rand(2.0, 4.0),
      ttl: rand(0.6, 1.2),
      color,
    });
  }
};

export const updateParticles = (
  particles: React.MutableRefObject<Particle[]>,
  deltaTime: number
): void => {
  for (let i = particles.current.length - 1; i >= 0; i--) {
    const p = particles.current[i];

    // Update position
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;

    // Apply gravity
    p.vy += 300 * deltaTime;

    // Update TTL
    p.ttl -= deltaTime;

    // Remove if expired
    if (p.ttl <= 0) {
      particles.current.splice(i, 1);
    }
  }
};

export const cleanupParticles = (particles: React.MutableRefObject<Particle[]>): void => {
  // Remove particles that are off-screen or expired
  particles.current = particles.current.filter(p => p.ttl > 0);

  // Limit total particles for performance
  if (particles.current.length > 200) {
    particles.current = particles.current.slice(-200);
  }
};