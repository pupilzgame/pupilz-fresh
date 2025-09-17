// Core game engine that coordinates all systems
import { useRef, useCallback } from 'react';
import { useAudioSystem } from './AudioSystem';
import { ScoringSystem } from './ScoringSystem';
import { EntityManager } from './EntityManager';

export interface GameState {
  phase: 'menu' | 'playing' | 'respawning' | 'game-over' | 'high-score' | 'leaderboard';
  score: number;
  level: number;
  lives: number;
  shieldLives: number;
  invulnTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

export interface GameWorld {
  width: number;
  height: number;
  scrollY: number;
  worldV: number;
  podX: number;
  podY: number;
}

export interface GameEngine {
  // State management
  gameState: React.MutableRefObject<GameState>;
  gameWorld: React.MutableRefObject<GameWorld>;

  // System references
  audio: ReturnType<typeof useAudioSystem>;
  scoring: ScoringSystem;
  entities: EntityManager;

  // Core loop
  update: (deltaTime: number) => void;
  render: () => void;

  // Game control
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (victory?: boolean) => void;
  resetGame: () => void;

  // Player actions
  movePlayer: (deltaX: number, deltaY: number) => void;
  fireWeapon: () => void;
  useNuke: () => void;
  useEnergyCell: () => void;

  // Game events
  onPlayerHit: () => void;
  onEnemyKilled: (enemy: any) => void;
  onLevelComplete: () => void;
  onPowerUpCollected: (powerup: any) => void;
}

export const useGameEngine = (width: number, height: number): GameEngine => {
  // Initialize systems
  const audio = useAudioSystem();
  const scoring = new ScoringSystem();
  const entities = new EntityManager();

  // Game state
  const gameState = useRef<GameState>({
    phase: 'menu',
    score: 0,
    level: 1,
    lives: 3,
    shieldLives: 0,
    invulnTime: 0,
    isPlaying: false,
    isPaused: false,
  });

  // Game world
  const gameWorld = useRef<GameWorld>({
    width,
    height,
    scrollY: 0,
    worldV: 95, // FREE_FALL constant
    podX: width / 2,
    podY: height * 0.75,
  });

  // Animation frame management
  const lastUpdate = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  // Core game loop
  const update = useCallback((deltaTime: number) => {
    if (!gameState.current.isPlaying || gameState.current.isPaused) return;

    // Update world scroll
    gameWorld.current.scrollY += gameWorld.current.worldV * deltaTime;

    // Update all entity categories
    entities.updateEntities('asteroids', deltaTime, gameWorld.current);
    entities.updateEntities('ships', deltaTime, gameWorld.current);
    entities.updateEntities('barriers', deltaTime, gameWorld.current);
    entities.updateEntities('projectiles', deltaTime, gameWorld.current);
    entities.updateEntities('powerups', deltaTime, gameWorld.current);
    entities.updateEntities('drones', deltaTime, gameWorld.current);

    // Update scoring system
    scoring.updateScorePopups(deltaTime);

    // Update invulnerability time
    if (gameState.current.invulnTime > 0) {
      gameState.current.invulnTime -= deltaTime;
    }
  }, [entities, scoring]);

  const render = useCallback(() => {
    // This would be called by the React component
    // The actual rendering is handled by React components
  }, []);

  // Game control functions
  const startGame = useCallback(() => {
    gameState.current = {
      ...gameState.current,
      phase: 'playing',
      isPlaying: true,
      isPaused: false,
      score: 0,
      level: 1,
      lives: 3,
      shieldLives: 0,
      invulnTime: 0,
    };

    // Reset systems
    entities.reset();
    scoring.reset();

    // Reset world
    gameWorld.current.scrollY = 0;
    gameWorld.current.worldV = 95;
    gameWorld.current.podX = gameWorld.current.width / 2;
    gameWorld.current.podY = gameWorld.current.height * 0.75;

    // Start game music
    audio.playGameplayMusic();
  }, [entities, scoring, audio]);

  const pauseGame = useCallback(() => {
    gameState.current.isPaused = true;
  }, []);

  const resumeGame = useCallback(() => {
    gameState.current.isPaused = false;
  }, []);

  const endGame = useCallback((victory: boolean = false) => {
    gameState.current.isPlaying = false;
    gameState.current.phase = victory ? 'high-score' : 'game-over';

    // Calculate final score
    const finalScore = scoring.calculateFinalScore(
      gameState.current.score,
      gameState.current.level,
      gameState.current.lives,
      0, // TODO: Add survival time tracking
      victory
    );

    gameState.current.score = finalScore;

    // Play appropriate music
    if (victory) {
      audio.playEarthReachedMusic();
    } else {
      audio.playMissionFailedMusic();
    }
  }, [scoring, audio]);

  const resetGame = useCallback(() => {
    startGame(); // Reset and start fresh
  }, [startGame]);

  // Player actions
  const movePlayer = useCallback((deltaX: number, deltaY: number) => {
    if (!gameState.current.isPlaying) return;

    // Apply movement with bounds checking
    gameWorld.current.podX = Math.max(
      20,
      Math.min(
        gameWorld.current.width - 20,
        gameWorld.current.podX + deltaX
      )
    );

    gameWorld.current.podY = Math.max(
      100,
      Math.min(
        gameWorld.current.height - 100,
        gameWorld.current.podY + deltaY
      )
    );
  }, []);

  const fireWeapon = useCallback(() => {
    if (!gameState.current.isPlaying) return;

    // Create projectile
    const projectile = entities.createProjectile(
      gameWorld.current.podX,
      gameWorld.current.podY - 20,
      0,
      -350, // Upward velocity
      1,
      'basic'
    );

    entities.addEntity('projectiles', projectile);
    audio.playWeaponFireSound();
  }, [entities, audio]);

  const useNuke = useCallback(() => {
    if (!gameState.current.isPlaying) return;

    // Clear nearby enemies
    const nearbyEnemies = entities.findEntitiesInRadius(
      'asteroids',
      gameWorld.current.podX,
      gameWorld.current.podY + gameWorld.current.scrollY,
      140 // NUKE_RANGE
    );

    nearbyEnemies.forEach(enemy => {
      scoring.scoreAsteroidKill(enemy as any, gameState.current.level);
      entities.removeEntity('asteroids', enemy.id);
    });

    // TODO: Add nuke visual effect
  }, [entities, scoring]);

  const useEnergyCell = useCallback(() => {
    if (!gameState.current.isPlaying) return;

    // Add shield lives
    gameState.current.shieldLives = Math.min(6, gameState.current.shieldLives + 3);
    gameState.current.invulnTime = 3.0;

    audio.playUseItemSound();
  }, [audio]);

  // Game events
  const onPlayerHit = useCallback(() => {
    if (gameState.current.invulnTime > 0) return;

    if (gameState.current.shieldLives > 0) {
      gameState.current.shieldLives--;
      gameState.current.invulnTime = 1.5;
    } else {
      gameState.current.lives--;
      gameState.current.invulnTime = 1.5;

      if (gameState.current.lives <= 0) {
        endGame(false);
      }
    }

    audio.playHumanShipExplodeSound();
  }, [audio, endGame]);

  const onEnemyKilled = useCallback((enemy: any) => {
    // Award points based on enemy type
    if (enemy.type === 'asteroid') {
      scoring.scoreAsteroidKill(enemy, gameState.current.level);
    } else if (enemy.type === 'ship') {
      scoring.scoreShipKill(enemy, gameState.current.level);
    }

    gameState.current.score = scoring.getScore();
    audio.playAsteroidBreakingSound();
  }, [scoring, audio]);

  const onLevelComplete = useCallback(() => {
    gameState.current.level++;

    // Check for victory condition
    if (gameState.current.level > 5) {
      endGame(true);
    } else {
      audio.playClearLevelSound();
    }
  }, [audio, endGame]);

  const onPowerUpCollected = useCallback((powerup: any) => {
    audio.playGetItemSound();

    switch (powerup.kind) {
      case 'shield':
        gameState.current.shieldLives = Math.min(6, gameState.current.shieldLives + 1);
        break;
      case 'weapon':
        // TODO: Upgrade weapon system
        break;
      case 'drone':
        // TODO: Add drone
        break;
    }
  }, [audio]);

  return {
    gameState,
    gameWorld,
    audio,
    scoring,
    entities,
    update,
    render,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    movePlayer,
    fireWeapon,
    useNuke,
    useEnergyCell,
    onPlayerHit,
    onEnemyKilled,
    onLevelComplete,
    onPowerUpCollected,
  };
};