/**
 * Math utilities for game calculations
 * Extracted from App.tsx for better organization
 */

/**
 * Generate a random number between min and max
 */
export const rand = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

/**
 * Clamp a value between a minimum and maximum
 */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/**
 * Linear interpolation between two values
 */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/**
 * Calculate distance between two points
 */
export const distance = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * Check collision between two circles
 */
export const circleCollision = (
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceSquared = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distanceSquared <= radiusSum * radiusSum;
};

/**
 * Check collision between a rectangle and a circle
 */
export const rectCircleCollision = (
  rectX: number, rectY: number, rectW: number, rectH: number,
  circleX: number, circleY: number, circleR: number
): boolean => {
  // Find the closest point to the circle within the rectangle
  const closestX = clamp(circleX, rectX, rectX + rectW);
  const closestY = clamp(circleY, rectY, rectY + rectH);

  // Calculate the distance between the circle's center and this closest point
  const distanceX = circleX - closestX;
  const distanceY = circleY - closestY;

  // If the distance is less than the circle's radius, an intersection occurs
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;
  return distanceSquared <= circleR * circleR;
};

/**
 * Normalize a vector (make it unit length)
 */
export const normalize = (x: number, y: number): { x: number; y: number } => {
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
};

/**
 * Convert degrees to radians
 */
export const degToRad = (degrees: number): number => degrees * (Math.PI / 180);

/**
 * Convert radians to degrees
 */
export const radToDeg = (radians: number): number => radians * (180 / Math.PI);
