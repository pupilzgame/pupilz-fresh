/**
 * Game configuration constants
 * Extracted from App.tsx for better organization and easy tuning
 */

// Player constants
export const POD_RADIUS = 18;

// Movement and physics
export const FREE_FALL = 220;
export const MIN_DESCENT = 140;
export const MAX_DESCENT = 520;
export const RETURN_TO_FF = 3.0;

// Movement limits
export const MAX_H = 560;
export const MAX_V = 520;

// Gesture controls
export const GESTURE_VEL_GAIN = 28.0;
export const GESTURE_DEADZONE = 6;   // pixels, prevents micro jitter
export const GESTURE_PAD_DIV = 60;

// Level progression
export const LEVEL_MIN = 2000;
export const LEVEL_MAX = 2800;

// Entity spawning distances
export const AST_BASE_SPACING = 280;
export const BAR_BASE_SPACING = 560;
export const PWR_BASE_SPACING = 800;
export const SHIP_BASE_SPACING = 1100;

// Asteroid properties
export const AST_MIN_R = 14;
export const AST_MAX_R = 32;
export const AST_MAX_VX = 55;
export const AST_REL_VY = 30;

// Barrier properties
export const BAR_W_MIN = 90;
export const BAR_W_MAX = 170;
export const BAR_H = 16;
export const BAR_VX = 60;
export const BAR_REL_VY = 20;

// Background stars configuration
export const STAR_LAYERS = [
  { count: 28, parallax: 0.3, size: 2, opacity: 0.35 },
  { count: 20, parallax: 0.55, size: 3, opacity: 0.55 },
  { count: 14, parallax: 0.8, size: 4, opacity: 0.8 },
];

// Projectile speeds
export const BULLET_SPEED = 900;
export const LASER_SPEED = 1250;
export const FIRE_SPEED = 800;
export const HOMING_SPEED = 720;

// Enemy projectile speeds
export const EN_MISSILE_SPEED = 360;
export const EN_PLASMA_SPEED = 540;

// Weapon cooldowns - Professional weapon balance for strategic depth
export const CD = { 
  basic: 0.22,  // Basic blaster - decent but makes pickups feel better
  M: 0.16,      // Fast crowd control
  S: 0.32,      // Slower but devastating burst
  L: 0.35,      // Slow but piercing precision
  F: 0.20,      // Steady sustained DPS
  H: 0.45       // Slowest but explosive smart targeting
} as const;

export const RAPID_FACTOR = 0.14;

// Nuke system
export const SWEEP_SPEED = 2200; // px/sec
export const NUKE_FLASH_TIME = 0.12;

// Ring mechanics
export const RING_SHRINK_RATE = 0.03;
export const RING_MIN_FRACTION = 0.55;

// Shield system
export const MAX_SHIELD_LIVES = 6;
export const HIT_INVULN_TIME = 1.0;

// Time slow power-up
export const TIME_SLOW_DURATION = 5.0; // 5 seconds
export const TIME_SLOW_FACTOR = 0.3;   // 30% speed (70% slower)

// Drone system
export const MAX_DRONES = 3;
export const DRONE_ORBIT_RADIUS = 35;
export const DRONE_ORBIT_SPEED = 2.0; // radians per second
export const DRONE_KAMIKAZE_SPEED = 400;
export const DRONE_ACTIVATION_DISTANCE = 190;

// Energy cell power-up
export const ENERGY_IFRAME_TIME = 3.0;  // 3 seconds
export const ENERGY_SHIELD_GAIN = 3;    // +3 rings

// Boss system
export const BOSS_COLLISION_RADIUS = 28; // matches 56px visual boss size
