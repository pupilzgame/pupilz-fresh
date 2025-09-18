/**
 * Color constants for visual effects and UI elements
 * Centralized color palette for consistent theming
 */

// Muzzle flash colors
export const MUZZLE_FLASH = {
  BASIC: "#B1E1FF",      // Basic weapon muzzle flash
  MULTI_1: "#A0E0FF",    // Multi-gun muzzle flash variant 1
  MULTI_2: "#80D0FF",    // Multi-gun muzzle flash variant 2
  FIRE: "#FFB46B",       // Fire weapon muzzle flash
  HOMING: "#FFE486",     // Homing missiles muzzle flash
} as const;

// Explosion and boom colors
export const EXPLOSION = {
  YELLOW: "#FFE486",     // Standard yellow explosion
  GOLD: "#FFD700",       // Gold explosion (drones, special hits)
  LIGHT_GOLD: "#FFD890", // Light gold explosion
  GREEN: "#A7F3D0",      // Green explosion (pickups)
  MINT_GREEN: "#9FFFB7", // Mint green explosion
  BRIGHT_GREEN: "#CFFFD1", // Bright green explosion
  BLUE: "#B1E1FF",       // Blue explosion
  CYAN: "#39D3FF",       // Cyan explosion
  RED: "#FF4444",        // Red explosion (damage)
  ORANGE_RED: "#FF6B35", // Orange-red explosion
  LIGHT_RED: "#FF8A80",  // Light red (boss mode)
} as const;

// Weapon hit effect colors
export const WEAPON_HIT = {
  LASER: "#B1E1FF",      // Laser weapon hit color
  FIRE: "#FFB46B",       // Fire weapon hit color
  DEFAULT: "#FFE486",    // Default weapon hit color
} as const;

// Visual effect colors for particles and trails
export const EFFECT = {
  ENERGY_TRAIL_1: "#FFE486",  // Energy trail color 1
  ENERGY_TRAIL_2: "#A7F3D0",  // Energy trail color 2
  ENERGY_TRAIL_3: "#B1E1FF",  // Energy trail color 3
  PROJECTILE_1: "#39D3FF",    // Projectile color 1
  PROJECTILE_2: "#A7F3D0",    // Projectile color 2
  PROJECTILE_3: "#FFE486",    // Projectile color 3
  DAMAGE_FLASH: "#FF4444",    // Damage flash color
} as const;

// Combined export for easy access
export const COLORS = {
  MUZZLE_FLASH,
  EXPLOSION,
  WEAPON_HIT,
  EFFECT,
} as const;