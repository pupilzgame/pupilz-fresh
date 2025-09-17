// Game constants extracted from App.tsx

// Performance and rendering
export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

// Screen and UI
export const POD_RADIUS = 20;
export const GLOW_RADIUS = POD_RADIUS + 8;
export const BOTTOM_PADDING = 120;

// Physics and movement
export const FREE_FALL = 95;
export const WORLD_ACCEL = 18;
export const MAX_WORLD_V = 280;
export const HORIZONTAL_SPEED = 200;
export const VERTICAL_SPEED = 180;

// Combat and timing
export const HIT_INVULN_TIME = 1.5;
export const RESPAWN_DELAY = 3.0;
export const NUKE_RANGE = 140;
export const SWEEP_SPEED = 600;

// Projectile physics
export const PROJECTILE_SPEED = 350;
export const LASER_SPEED = 500;
export const FIRE_SPEED = 280;
export const HOMING_SPEED = 320;

// Pickup chances (percentages)
export const ENERGY_CELL_CHANCE = 8;
export const NUKE_CHANCE = 8;
export const WEAPON_UPGRADE_CHANCE = 6;

// Ring system
export const RING_FLOAT_SPEED = 50;
export const RING_RESPAWN_DELAY = 4000; // milliseconds

// Level progression
export const SHIP_QUOTAS = [2, 3, 4, 5]; // Ships needed for levels 1-4
export const BOSS_LEVEL = 5;

// Scoring system
export const MIN_SCORE_THRESHOLD = 100;
export const ASTEROID_BASE_SCORE = 10;
export const BARRIER_BASE_SCORE = 20;
export const SHIP_BASE_SCORE = 100;
export const BOSS_BASE_SCORE = 1000;

// Audio
export const DEFAULT_MUSIC_VOLUME = 0.7;

// Particle system
export const MAX_PARTICLES = 200;
export const PARTICLE_CLEANUP_INTERVAL = 100; // frames

// Enemy behavior
export const ASTEROID_MIN_SPEED = 30;
export const ASTEROID_MAX_SPEED = 120;
export const SHIP_SPEED = 80;
export const BARRIER_SPEED = 60;

// Boss behavior
export const BOSS_HEALTH = 15;
export const BOSS_SPEED = 60;
export const BOSS_FIRE_RATE = 1.5; // seconds

// Input and controls
export const TOUCH_DEADZONE = 10; // pixels
export const JOYSTICK_RADIUS = 50;

// Achievement thresholds
export const CENTURION_SCORE = 100000;
export const ELITE_PILOT_SCORE = 250000;
export const BOSS_FIGHTER_LEVEL = 5;

// Device performance tiers
export const LOW_END_DEVICE_PARTICLE_LIMIT = 50;
export const HIGH_END_DEVICE_PARTICLE_LIMIT = 200;

// Game world dimensions (will be set dynamically)
export const DEFAULT_WIDTH = 400;
export const DEFAULT_HEIGHT = 800;

// Color constants
export const COLORS = {
  // UI colors
  PRIMARY_TEXT: '#FFFFFF',
  SECONDARY_TEXT: '#CCCCCC',
  ACCENT: '#FF3366',
  BACKGROUND: '#000011',

  // Game object colors
  POD: '#4FC3F7',
  POD_GLOW: 'rgba(79, 195, 247, 0.3)',
  LASER: '#B1E1FF',
  FIRE: '#FFB46B',
  BASIC: '#FFE486',

  // Enemy colors
  ASTEROID_BROWN: '#8D6E63',
  ASTEROID_GRAY: '#78909C',
  ASTEROID_DARK: '#455A64',
  SHIP_RED: '#F44336',
  BARRIER_BLUE: '#2196F3',

  // Particle effects
  EXPLOSION_ORANGE: '#FF6B35',
  EXPLOSION_RED: '#FF4444',
  VICTORY_GOLD: '#FFD700',
  DRONE_GOLD: '#FFD700',

  // Ring colors
  RING_GREEN: '#4CAF50',
  RING_EARTH: '#2E7D32',
  RING_BOSS: '#FF8A80',
} as const;

// Weapon types
export const WEAPON_TYPES = {
  BASIC: 'basic',
  LASER: 'laser',
  FIRE: 'fire',
  MULTI: 'multi',
  SPREAD: 'spread',
  HOMING: 'homing',
} as const;

// Game states
export const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  HIGH_SCORE: 'high_score',
  LEADERBOARD: 'leaderboard',
} as const;

// Achievement types
export const ACHIEVEMENTS = {
  EARTH_REACHED: 'EARTH_REACHED',
  CENTURION: 'CENTURION',
  ELITE_PILOT: 'ELITE_PILOT',
  BOSS_FIGHTER: 'BOSS_FIGHTER',
} as const;

// Asteroid types
export const ASTEROID_TYPES = {
  SMALL: { size: 1, health: 1, score: 10 },
  MEDIUM: { size: 1.5, health: 2, score: 20 },
  LARGE: { size: 2, health: 3, score: 30 },
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  PERSONAL_BEST: 'pupilz_personal_best',
  LAST_RANK: 'pupilz_last_rank',
  SFX_ENABLED: 'pupilz_sfx_enabled',
  MUSIC_ENABLED: 'pupilz_music_enabled',
  LEFT_HANDED: 'pupilz_left_handed',
} as const;