// Math utility functions extracted from App.tsx

export const rand = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distanceSquared = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};

export const normalize = (x: number, y: number): { x: number; y: number } => {
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
};

export const angleBetween = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1);
};

export const rotatePoint = (x: number, y: number, angle: number): { x: number; y: number } => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
};

export const wrapAngle = (angle: number): number => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

export const easeInOut = (t: number): number => {
  return t * t * (3 - 2 * t);
};

export const easeOut = (t: number): number => {
  return 1 - Math.pow(1 - t, 2);
};

export const easeIn = (t: number): number => {
  return t * t;
};

// Screen coordinate utilities
export const screenToWorld = (screenY: number, scrollY: number): number => {
  return screenY + scrollY;
};

export const worldToScreen = (worldY: number, scrollY: number): number => {
  return worldY - scrollY;
};

// Collision detection
export const circleCollision = (
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const rSum = r1 + r2;
  return dx * dx + dy * dy <= rSum * rSum;
};

export const pointInCircle = (px: number, py: number, cx: number, cy: number, r: number): boolean => {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
};

export const lineIntersectsCircle = (
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): boolean => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = (fx * fx + fy * fy) - r * r;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  const discriminantSqrt = Math.sqrt(discriminant);
  const t1 = (-b - discriminantSqrt) / (2 * a);
  const t2 = (-b + discriminantSqrt) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
};

// Rectangle collision with circle
export const rectCircleCollision = (
  rectX: number, rectY: number, rectW: number, rectH: number,
  circleX: number, circleY: number, circleR: number
): boolean => {
  const closestX = clamp(circleX, rectX, rectX + rectW);
  const closestY = clamp(circleY, rectY, rectY + rectH);

  const dx = circleX - closestX;
  const dy = circleY - closestY;

  return dx * dx + dy * dy <= circleR * circleR;
};

// Random utilities
export const randomChoice = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(rand(min, max + 1));
};

export const randomBool = (probability: number = 0.5): boolean => {
  return Math.random() < probability;
};

// Color utilities
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const interpolateColor = (color1: string, color2: string, t: number): string => {
  // Simple linear interpolation between two hex colors
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};