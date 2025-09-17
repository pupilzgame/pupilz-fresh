import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../state/store';
import { startLoop } from '../engine/loop';
import { WeaponSystem } from '../systems/WeaponSystem';
import { LevelManager } from '../systems/LevelManager';
import { EnemySpawner } from '../systems/EnemySpawner';
import { ScoringSystem } from '../systems/ScoringSystem';
import { EntityManager } from '../systems/EntityManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { GameHUD } from '../components/UI/GameHUD';
import HexagonAsteroid from '../components/HexagonAsteroid';

export default function GameScene() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Zustand store
  const {
    score,
    level,
    lives,
    podX,
    podY,
    scrollY,
    worldV,
    addScore,
    updatePodPosition,
    updateWorld,
    setLives,
    setLevel,
    endGame
  } = useGameStore();

  // Game systems
  const weaponSystem = useRef(new WeaponSystem()).current;
  const levelManager = useRef(new LevelManager()).current;
  const enemySpawner = useRef(new EnemySpawner()).current;
  const scoringSystem = useRef(new ScoringSystem()).current;
  const entityManager = useRef(new EntityManager()).current;
  const collisionSystem = useRef(new CollisionSystem()).current;

  // Game loop control
  const stopLoopRef = useRef<(() => void) | null>(null);

  // Visual effects
  const particles = useRef<any[]>([]);
  const stars = useRef<Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}>>([]);

  // Touch input
  const touching = useRef(false);
  const touchX = useRef(0);
  const touchY = useRef(0);

  // Initialize game systems
  useEffect(() => {
    console.log('🎮 GAME SCENE: Initializing with dimensions', width, 'x', height);

    // Initialize pod position at center of screen
    const centerX = width / 2;
    const centerY = height * 0.7; // 70% down the screen
    updatePodPosition(centerX, centerY);
    console.log('🎯 GAME SCENE: Pod positioned at', centerX, centerY);

    // Initialize stars
    const initStars = [];
    const starLayers = [
      { count: 25, parallax: 0.2, size: 1, opacity: 0.3 },
      { count: 20, parallax: 0.5, size: 2, opacity: 0.5 },
      { count: 15, parallax: 0.8, size: 3, opacity: 0.7 },
    ];

    starLayers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        initStars.push({
          id: `L${li}-${i}`,
          x: Math.random() * width,
          y: Math.random() * height,
          size: layer.size,
          parallax: layer.parallax,
          opacity: layer.opacity
        });
      }
    });
    stars.current = initStars;
    console.log('⭐ GAME SCENE: Initialized', initStars.length, 'stars');

    // Initialize enemy spawner
    enemySpawner.initializeSpawnPositions({
      width,
      height,
      level: levelManager.getCurrentLevel(),
      scrollY,
      bufferDistance: 1200,
    });

    // Start game loop
    console.log('🔄 GAME SCENE: Starting game loop');
    stopLoopRef.current = startLoop((deltaTime) => {
      // Update world scroll
      const newScrollY = scrollY + worldV * deltaTime;
      updateWorld(newScrollY, worldV);

      // Update stars parallax
      for (const s of stars.current) {
        s.y += worldV * s.parallax * deltaTime;
        if (s.y > height + 4) {
          s.y = -4;
          s.x = Math.random() * width;
        }
      }

      // Update weapon system
      weaponSystem.update(Date.now() / 1000);

      // Update level manager
      levelManager.updateRing(deltaTime, height);

      // Spawn enemies
      const spawnConfig = {
        width,
        height,
        level: levelManager.getCurrentLevel(),
        scrollY: newScrollY,
        bufferDistance: 1200,
      };

      const newEntities = enemySpawner.spawnAhead(spawnConfig, false);

      // Add entities to manager
      newEntities.asteroids.forEach(asteroid => entityManager.addEntity('asteroids', asteroid));
      newEntities.barriers.forEach(barrier => entityManager.addEntity('barriers', barrier));
      newEntities.ships.forEach(ship => entityManager.addEntity('ships', ship));
      newEntities.powerups.forEach(powerup => entityManager.addEntity('powerups', powerup));

      // Update all entities
      entityManager.updateEntities('asteroids', deltaTime, { width, height });
      entityManager.updateEntities('barriers', deltaTime, { width, height });
      entityManager.updateEntities('ships', deltaTime, { width, height });
      entityManager.updateEntities('projectiles', deltaTime, { width, height });
      entityManager.updateEntities('powerups', deltaTime, { width, height });

      // Handle weapon firing
      if (weaponSystem.canFire(Date.now() / 1000)) {
        weaponSystem.fire(podX, podY - 20, Date.now() / 1000, entityManager);
      }

      // Collision detection
      const projectileHits = collisionSystem.checkProjectileCollisions(
        entityManager.getEntities('projectiles'),
        entityManager.getAllEntities()
      );

      projectileHits.forEach(hit => {
        const points = scoringSystem.scoreAsteroidKill(hit.target, levelManager.getCurrentLevel());
        addScore(points);

        entityManager.removeEntity(hit.targetCategory, hit.target.id);
        entityManager.removeEntity('projectiles', hit.projectile.id);

        // Create explosion particles
        particles.current.push({
          id: Math.random(),
          x: hit.target.x,
          y: hit.target.y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          r: 2 + Math.random() * 3,
          ttl: 0.5 + Math.random() * 0.5,
          color: '#FF6B35',
        });
      });

      // Update particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.ttl -= deltaTime;

        if (p.ttl <= 0) {
          particles.current.splice(i, 1);
        }
      }

      // Check for game over conditions
      if (lives <= 0) {
        endGame(false);
      }

      // Check for victory
      if (levelManager.isGameComplete()) {
        endGame(true);
      }
    });

    return () => {
      if (stopLoopRef.current) {
        stopLoopRef.current();
      }
    };
  }, [width, height]);

  // Touch handlers
  const handleTouchStart = (event: any) => {
    touching.current = true;
    const touch = event.nativeEvent.touches[0];
    touchX.current = touch.pageX;
    touchY.current = touch.pageY;
  };

  const handleTouchMove = (event: any) => {
    if (!touching.current) return;

    const touch = event.nativeEvent.touches[0];
    const deltaX = touch.pageX - touchX.current;
    const deltaY = touch.pageY - touchY.current;

    const newX = Math.max(20, Math.min(width - 20, podX + deltaX));
    const newY = Math.max(100, Math.min(height - 100, podY + deltaY));

    updatePodPosition(newX, newY);

    touchX.current = touch.pageX;
    touchY.current = touch.pageY;
  };

  const handleTouchEnd = () => {
    touching.current = false;
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.gameContent}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background stars */}
        {stars.current.map((s) => (
          <View key={s.id} style={[styles.star, {
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            transform: [{ translateX: s.x }, { translateY: s.y + insets.top }]
          }]} />
        ))}

        {/* Game entities - Asteroids */}
        {entityManager.getEntities('asteroids').map((a) => {
          const rotation = (a.id * 17 + (Date.now() * 0.01)) % 360;
          return (
            <View
              key={`A-${a.id}`}
              style={{
                position: 'absolute',
                width: a.r * 2,
                height: a.r * 2,
                transform: [
                  { translateX: a.x - a.r },
                  { translateY: a.y - scrollY - a.r },
                ]
              }}
            >
              <HexagonAsteroid
                size={a.r}
                backgroundColor={a.color || '#8B4513'}
                borderColor="#654321"
                opacity={1}
                rotation={rotation}
                damageFlash={false}
              />
            </View>
          );
        })}

        {/* Game entities - Projectiles */}
        {entityManager.getEntities('projectiles').map((p) => (
          <View
            key={`P-${p.id}`}
            style={[
              styles.projectile,
              {
                width: 4,
                height: 8,
                backgroundColor: p.color || '#FFE486',
                transform: [{ translateX: p.x - 2 }, { translateY: p.y - scrollY - 4 }]
              }
            ]}
          />
        ))}

        {/* Player pod */}
        <View
          style={[
            styles.pod,
            {
              transform: [{ translateX: podX - 18 }, { translateY: podY - 18 }]
            }
          ]}
        />

        {/* Particles */}
        {particles.current.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                width: p.r * 2,
                height: p.r * 2,
                backgroundColor: p.color,
                transform: [{ translateX: p.x - p.r }, { translateY: p.y - p.r }]
              }
            ]}
          />
        ))}

        {/* DEBUG: Bright test element to see if anything renders */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 50,
          width: 100,
          height: 100,
          backgroundColor: 'red',
          zIndex: 999,
        }} />

        <View style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: 10,
          backgroundColor: 'yellow',
          zIndex: 999,
        }}>
          <Text style={{ color: 'black', fontSize: 16 }}>GAME SCENE LOADED!</Text>
        </View>

        {/* HUD */}
        <GameHUD
          level={level}
          score={score}
          lives={lives}
          maxLives={3}
          shipsKilled={levelManager.getShipsKilled()}
          shipQuota={levelManager.getShipQuota()}
          progressText={levelManager.getProgressText()}
          weaponInfo={weaponSystem.getWeaponInfo()}
          energyCells={0}
          nukesLeft={0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060913',
  },
  gameContent: {
    flex: 1,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#8FB7FF',
    borderRadius: 2,
    zIndex: 0,
  },
  pod: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#39D3FF',
    borderWidth: 2,
    borderColor: '#0AA3C2',
    zIndex: 4,
  },
  projectile: {
    position: 'absolute',
    borderRadius: 2,
    zIndex: 3,
  },
  particle: {
    position: 'absolute',
    borderRadius: 10,
    zIndex: 3,
  },
});