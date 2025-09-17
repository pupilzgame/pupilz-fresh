

// app/index.tsx
// Pupilz Pod Descent — Stage 1 (LVL 1–5), polished test build (A+B fixes applied)
// Input: lower-half free gesture (pad removed). Auto-fire always ON.
// Pickups: B = Bubble Shield (+1, up to 6). E = Energy Cell (store; on use: +3 shields & 3s i-frames).
// Weapons: M/S/L/F/H scale with upgrades; L buffed; H prioritizes ships.
// Boss @ LVL 5: spawns from bottom, slow Pong bounce within band below the pod, HP persists, "EARTH" ring after kill.
// Nuke: expanding sweep from the pod; clears threats, spares power-ups; no lag.
// Death: megaman-style pop; no freeze; world keeps animating. Overlay shows. Tap to exit.

import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFullScreenPWA } from './useFullScreenPWA';
import './global.css';
import { Audio } from 'expo-av';
/* ---------- CSS Hexagon Component ---------- */
function HexagonAsteroid({ 
  size, 
  backgroundColor, 
  borderColor, 
  opacity = 1, 
  rotation = 0, 
  damageFlash = false 
}: { 
  size: number; 
  backgroundColor: string; 
  borderColor: string; 
  opacity?: number; 
  rotation?: number; 
  damageFlash?: boolean; 
}) {
  // Always use backgroundColor, ignore damageFlash to prevent white flashing
  const displayColor = backgroundColor;

  return (
    <View style={{
      width: size * 2,
      height: size * 2,
      opacity,
      transform: [{ rotate: `${rotation}deg` }],
    }}>
      {/* Hexagon made from 3 rotated rectangles */}
      <View style={{
        position: 'absolute',
        width: size * 1.732, // sqrt(3) for proper hexagon
        height: size * 1.2,
        backgroundColor: displayColor,
        borderWidth: 2,
        borderColor: borderColor,
        borderRadius: size * 0.2,
        top: size * 0.4,
        left: size * 0.134,
      }} />
      <View style={{
        position: 'absolute',
        width: size * 1.732,
        height: size * 1.2,
        backgroundColor: displayColor,
        borderWidth: 2,
        borderColor: borderColor,
        borderRadius: size * 0.2,
        top: size * 0.4,
        left: size * 0.134,
        transform: [{ rotate: '60deg' }],
      }} />
      <View style={{
        position: 'absolute',
        width: size * 1.732,
        height: size * 1.2,
        backgroundColor: displayColor,
        borderWidth: 2,
        borderColor: borderColor,
        borderRadius: size * 0.2,
        top: size * 0.4,
        left: size * 0.134,
        transform: [{ rotate: '120deg' }],
      }} />
    </View>
  );
}

/* ---------- Types ---------- */
type AsteroidType = "rock" | "metal" | "crystal" | "debris" | "wreckage";
type Asteroid = { 
  id: number; x: number; y: number; vx: number; vy: number; r: number;
  type: AsteroidType; hp: number; maxHp: number; lastHit: number;
};
type BarrierType = "metal" | "energy" | "asteroid" | "debris";
type Barrier = { 
  id: number; x: number; y: number; w: number; h: number; vx: number; vy: number;
  type: BarrierType; hp: number; maxHp: number; lastHit: number;
};
type Star     = { id: string; x: number; y: number; size: number; parallax: number; opacity: number };
type PowerUp  = { id: number; x: number; y: number; kind: PUKind, vy: number };
type Phase    = "menu" | "playing" | "dead" | "win" | "respawning";

type PUKind = "S" | "M" | "L" | "F" | "H" | "R" | "B" | "E" | "T" | "D" | "N";

// Scalable AAA Scoring System Configuration
const SCORING_CONFIG = {
  basePoints: {
    asteroid: 10,
    barrier: 20,
    ship: 100,
    boss: 1000,
    // Future extensibility: drone: 75, mothership: 5000, etc.
  },

  typeMultipliers: {
    debris: 0.5,
    crystal: 0.7,
    rock: 1.0,
    energy: 1.0,
    metal: 1.5,
    asteroid: 2.0,
    wreckage: 1.8,
    // Future extensibility: plasma: 2.5, quantum: 3.0, etc.
  },

  // Scales infinitely for future levels
  levelMultipliers: [1.0, 1.0, 1.5, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0],

  bonuses: {
    survival: 2,        // per second survived
    levelComplete: 200, // × level number
    lifeBonus: 300,     // × remaining lives
    victoryBonus: 2000, // complete game victory
  }
} as const;

// AAA Leaderboard Management System with Vercel KV
class LeaderboardManager {
  private static readonly MIN_SCORE_THRESHOLD = 100;

  // Load leaderboard from Vercel KV
  static async loadLeaderboard(): Promise<LeaderboardState> {
    try {
      console.log('🗄️ Loading leaderboard from database...');
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        console.error(`❌ Leaderboard API failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return this.getDefaultState();
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.entries)) {
        console.error('❌ Invalid leaderboard data format:', data);
        return this.getDefaultState();
      }

      console.log(`✅ Loaded ${data.entries.length} leaderboard entries from database`);

      // Get personal best and last rank from localStorage (client-side only)
      const personalBest = typeof window !== 'undefined' ? parseInt(localStorage.getItem('pupilz_personal_best') || '0') : 0;
      const lastRank = typeof window !== 'undefined' && localStorage.getItem('pupilz_last_rank') ? parseInt(localStorage.getItem('pupilz_last_rank')!) : null;

      return {
        entries: data.entries,
        personalBest,
        lastRank,
        newHighScore: false
      };
    } catch (error) {
      console.warn('Failed to load leaderboard:', error);
      return this.getDefaultState();
    }
  }

  // Check if a score qualifies for the leaderboard
  static qualifiesForLeaderboard(score: number, currentEntries: LeaderboardEntry[]): boolean {
    if (score < this.MIN_SCORE_THRESHOLD) return false;
    if (currentEntries.length < 10) return true;
    const lowestScore = Math.min(...currentEntries.map(e => e.score));
    return score > lowestScore;
  }

  // Add a new entry to the leaderboard via API
  static async addEntry(
    state: LeaderboardState,
    playerName: string,
    score: number,
    level: number,
    victory: boolean
  ): Promise<{ newState: LeaderboardState; rank: number }> {
    try {
      console.log(`💾 Saving score to database: ${playerName} - ${score} points`);
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          score,
          level,
          victory
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to save score: ${response.status} ${response.statusText}`, errorText);
        throw new Error('Failed to add entry to leaderboard');
      }

      const data = await response.json();
      if (!data.success) {
        console.error('❌ Server rejected score entry:', data.error);
        throw new Error(data.error || 'Failed to add entry');
      }

      console.log(`✅ Score saved successfully! Rank: ${data.rank}`);

      // Update personal best and last rank in localStorage
      const newPersonalBest = Math.max(state.personalBest, score);
      const isNewHighScore = score > state.personalBest;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pupilz_personal_best', newPersonalBest.toString());
        localStorage.setItem('pupilz_last_rank', data.rank.toString());
      }

      // Reload leaderboard to get updated data
      const updatedState = await this.loadLeaderboard();
      updatedState.personalBest = newPersonalBest;
      updatedState.lastRank = data.rank;
      updatedState.newHighScore = isNewHighScore;

      return { newState: updatedState, rank: data.rank };
    } catch (error) {
      console.error('Failed to add leaderboard entry:', error);
      // Fallback to local state update
      return this.addEntryLocal(state, playerName, score, level, victory);
    }
  }

  // Fallback local method for offline functionality
  private static addEntryLocal(
    state: LeaderboardState,
    playerName: string,
    score: number,
    level: number,
    victory: boolean
  ): { newState: LeaderboardState; rank: number } {
    const newEntry: LeaderboardEntry = {
      id: Date.now().toString() + Math.random().toString(36),
      playerName: playerName.toUpperCase().substring(0, 12),
      score,
      level,
      victory,
      timestamp: Date.now(),
      achievements: this.calculateAchievements(score, level, victory)
    };

    const newEntries = [...state.entries, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const rank = newEntries.findIndex(entry => entry.id === newEntry.id) + 1;
    const newPersonalBest = Math.max(state.personalBest, score);
    const isNewHighScore = score > state.personalBest;

    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('pupilz_personal_best', newPersonalBest.toString());
      localStorage.setItem('pupilz_last_rank', rank.toString());
    }

    return {
      newState: {
        entries: newEntries,
        personalBest: newPersonalBest,
        lastRank: rank,
        newHighScore: isNewHighScore
      },
      rank
    };
  }

  // Calculate achievements for a score
  private static calculateAchievements(score: number, level: number, victory: boolean): string[] {
    const achievements: string[] = [];
    if (victory) achievements.push('EARTH_REACHED');
    if (score >= 100000) achievements.push('CENTURION');
    if (score >= 250000) achievements.push('ELITE_PILOT');
    if (level >= 5) achievements.push('BOSS_FIGHTER');
    return achievements;
  }

  // Get default empty state
  static getDefaultState(): LeaderboardState {
    const personalBest = typeof window !== 'undefined' ? parseInt(localStorage.getItem('pupilz_personal_best') || '0') : 0;
    const lastRank = typeof window !== 'undefined' && localStorage.getItem('pupilz_last_rank') ? parseInt(localStorage.getItem('pupilz_last_rank')!) : null;
    return {
      entries: [],
      personalBest,
      lastRank,
      newHighScore: false
    };
  }

  // Get rank suffix (1st, 2nd, 3rd, 4th, etc.)
  static getRankSuffix(rank: number): string {
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${rank}th`;
    }

    switch (lastDigit) {
      case 1: return `${rank}st`;
      case 2: return `${rank}nd`;
      case 3: return `${rank}rd`;
      default: return `${rank}th`;
    }
  }

  // Format score for display
  static formatScore(score: number): string {
    return score.toLocaleString();
  }

  // Get achievement display name
  static getAchievementName(achievement: string): string {
    const names: Record<string, string> = {
      'EARTH_REACHED': '🌍 Earth Reached',
      'CENTURION': '💯 Centurion',
      'ELITE_PILOT': '⭐ Elite Pilot',
      'BOSS_FIGHTER': '👾 Boss Fighter'
    };
    return names[achievement] || achievement;
  }
}

// Universal scoring function for any enemy type
const calculateEnemyScore = (
  enemyType: 'asteroid' | 'barrier' | 'ship' | 'boss',
  subType: string,
  radius: number = 20,
  level: number = 1
): number => {
  const basePoints = SCORING_CONFIG.basePoints[enemyType] || 10;
  const typeMultiplier = SCORING_CONFIG.typeMultipliers[subType as keyof typeof SCORING_CONFIG.typeMultipliers] || 1.0;
  const sizeMultiplier = Math.max(0.5, radius / 20);
  const levelMultiplier = SCORING_CONFIG.levelMultipliers[level - 1] || (level * 0.5);

  return Math.round(basePoints * typeMultiplier * sizeMultiplier * levelMultiplier);
};

type ProjKind = "bullet" | "laser" | "fire" | "homing";
type Projectile = {
  id: number; kind: ProjKind;
  x: number; y: number; vx: number; vy: number;
  r: number; ttl: number;
  pierce?: number;
  t?: number;
  turn?: number;
};

type EnemyShip = {
  id: number; x: number; y: number; vx: number; vy: number;
  hp: number; fireCD: number; kind: "scout" | "fighter";
};

type EnemyProj = { id: number; x: number; y: number; vx: number; vy: number; r: number; ttl: number; kind: "missile" | "plasma" };

type Drone = {
  id: number;
  angle: number;
  orbitRadius: number;
  active: boolean;
  mode: "orbit" | "kamikaze";
  targetX?: number;
  targetY?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Boss = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  hpMax: number;
  fireT: number;
  pattern: number;
};

type Particle = { id: number; x: number; y: number; vx: number; vy: number; r: number; ttl: number; color: string };

type ScorePopup = {
  id: number;
  x: number;
  y: number;
  score: number;
  ttl: number;
  maxTtl: number;
};

// AAA Leaderboard System Types
type LeaderboardEntry = {
  id: string;
  playerName: string;
  score: number;
  level: number;
  victory: boolean;
  timestamp: number;
  achievements: string[];
};

type LeaderboardState = {
  entries: LeaderboardEntry[];
  personalBest: number;
  lastRank: number | null;
  newHighScore: boolean;
};

/* ---------- Tunables ---------- */
const POD_RADIUS = 18;

// Descent feel
const FREE_FALL = 220;
const MIN_DESCENT = 140;
const MAX_DESCENT = 520;
const RETURN_TO_FF = 3.0;

// Free-move handling
const MAX_H   = 560;
const MAX_V   = 520;

// Gesture
const GESTURE_VEL_GAIN = 28.0;
const GESTURE_DEADZONE = 6;   // pixels, prevents micro jitter
const GESTURE_PAD_DIV  = 60;

// Distance between ring goals
const LEVEL_MIN = 2000;
const LEVEL_MAX = 2800;

// Spawns
const AST_BASE_SPACING = 280;
const BAR_BASE_SPACING = 560;
const PWR_BASE_SPACING = 800;
const SHIP_BASE_SPACING = 1100;

const AST_MIN_R = 14;
const AST_MAX_R = 32;
const AST_MAX_VX = 55;
const AST_REL_VY = 30;

const BAR_W_MIN = 90;
const BAR_W_MAX = 170;
const BAR_H = 16;
const BAR_VX = 60;
const BAR_REL_VY = 20;

// Stars BG
const STAR_LAYERS = [
  { count: 28, parallax: 0.3, size: 2, opacity: 0.35 },
  { count: 20, parallax: 0.55, size: 3, opacity: 0.55 },
  { count: 14, parallax: 0.8, size: 4, opacity: 0.8 },
];

// Projectiles
const BULLET_SPEED = 900;
const LASER_SPEED  = 1250;
const FIRE_SPEED   = 800;
const HOMING_SPEED = 720;

// Enemy projectiles
const EN_MISSILE_SPEED = 360;
const EN_PLASMA_SPEED  = 540;

// Weapon cooldowns
// Professional weapon balance: Trade-offs for strategic depth
const CD = { 
  basic: 0.22,  // Basic blaster - decent but makes pickups feel better
  M: 0.16,  // Fast crowd control (was 0.18)
  S: 0.32,  // Slower but devastating burst (was 0.26) 
  L: 0.35,  // Slow but piercing precision (was 0.3)
  F: 0.20,  // Steady sustained DPS (was 0.22)
  H: 0.45   // Slowest but explosive smart targeting (was 0.38)
} as const;
const RAPID_FACTOR = 0.14;

// Nuke sweep
const SWEEP_SPEED = 2200; // px/sec
const NUKE_FLASH_TIME = 0.12;

// Ring difficulty/scaling
const RING_SHRINK_RATE = 0.03;
const RING_MIN_FRACTION = 0.55;

// Shields
const MAX_SHIELD_LIVES = 6;
const HIT_INVULN_TIME = 1.0;

// Time Slow
const TIME_SLOW_DURATION = 5.0; // 5 seconds
const TIME_SLOW_FACTOR = 0.3; // 30% speed (70% slower)

// Drones
const MAX_DRONES = 3;
const DRONE_ORBIT_RADIUS = 35;
const DRONE_ORBIT_SPEED = 2.0; // radians per second
const DRONE_KAMIKAZE_SPEED = 400; // fast kamikaze attack speed
const DRONE_ACTIVATION_DISTANCE = 190; // pixels - optimal game studio standard for mobile emergency response

// Energy Cell
const ENERGY_IFRAME_TIME = 3.0;  // 3 seconds
const ENERGY_SHIELD_GAIN = 3;    // +3 rings

// Boss (decoupled collision radius for consistency)
const BOSS_COLLISION_RADIUS = 28; // matches 56px visual boss size

/* ---------- Helpers ---------- */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- Small UI: Accordion ---------- */
function Accordion({
  title,
  children,
  initial = false,
}: { title: string; children: React.ReactNode; initial?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.accordionHeader}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.accordionChevron}>{open ? "▾" : "▸"}</Text>
      </Pressable>
      {open && <View style={{ gap: 4 }}>{children}</View>}
    </View>
  );
}

/* ---------- Component ---------- */
/* ---------- Enhanced Menu Component ---------- */
type MenuSection = {
  id: string;
  icon: string;
  title: string;
  bullets?: string[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "gameplay",
    icon: "🎮",
    title: "HOW TO PLAY",
    bullets: [
      "Drag anywhere to move pod",
      "Auto-fire weapons continuously", 
      "Kill required ships each level",
      "Fly through rings to advance levels",
      "Defeat boss at Level 5 → fly through EARTH ring to win",
    ],
  },
  {
    id: "items",
    icon: "📦",
    title: "ITEMS & WEAPONS",
    bullets: [
      "🔫 Multi/Spread/Laser/Flame/Homing — collect to upgrade firepower",
      "⚡ Shield/Drone/Rapid/Time-slow — instant effects",
      "🎒 Energy/Nuke — tap bottom icons to use stored items",
    ],
  },
];

type AccordionItemProps = {
  section: MenuSection;
  isOpen: boolean;
  onToggle: () => void;
};

const AccordionItem: React.FC<AccordionItemProps> = ({ section, isOpen, onToggle }) => {
  const contentAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const maxHeight = (section.bullets?.length || 0) * 50 + 32; // Increased from 36 to 50 per bullet, 28 to 32 base
  const height = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });

  const opacity = contentAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.menuCard}>
      <Pressable onPress={onToggle} style={styles.menuHeader}>
        <View style={styles.menuHeaderContent}>
          <Text style={styles.menuIcon}>{section.icon}</Text>
          <Text style={styles.menuTitle}>{section.title}</Text>
        </View>
        <Text style={[styles.menuChevron, { transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }]}>
          ▶
        </Text>
      </Pressable>
      
      <Animated.View style={[styles.menuContent, { height, opacity }]}>
        <View style={styles.menuBullets}>
          {section.bullets?.map((bullet, idx) => (
            <View key={idx} style={styles.menuBullet}>
              <Text style={styles.menuBulletDot}>•</Text>
              <Text style={styles.menuBulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

type SettingsAccordionProps = {
  section: MenuSection;
  isOpen: boolean;
  onToggle: () => void;
  leftHandedMode: boolean;
  onToggleHandedness: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
};

const SettingsAccordion: React.FC<SettingsAccordionProps> = ({ 
  section, isOpen, onToggle, leftHandedMode, onToggleHandedness, 
  musicEnabled, onToggleMusic 
}) => {
  const contentAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const maxHeight = 200; // Fixed height for settings toggles
  const height = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });
  const opacity = contentAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.accordionItem}>
      <Pressable onPress={onToggle} style={styles.accordionHeader}>
        <Text style={styles.accordionIcon}>{section.icon}</Text>
        <Text style={styles.accordionTitle}>{section.title}</Text>
        <Text style={[styles.accordionChevron, { transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }]}>
          ▶
        </Text>
      </Pressable>
      <Animated.View style={[styles.accordionContent, { height, opacity }]}>
        {/* Handedness Toggle */}
        <Pressable 
          onPress={onToggleHandedness}
          style={styles.handednessToggle}
        >
          <Text style={styles.handednessLabel}>
            {leftHandedMode ? '👈 Left-Handed Mode' : '👉 Right-Handed Mode'}
          </Text>
          <View style={[
            styles.toggleSwitch,
            !leftHandedMode && styles.toggleSwitchActive
          ]}>
            <View style={[
              styles.toggleKnob,
              !leftHandedMode && styles.toggleKnobActive
            ]} />
          </View>
        </Pressable>
        
        {/* Music Toggle */}
        <Pressable 
          onPress={onToggleMusic}
          style={styles.handednessToggle}
        >
          <Text style={styles.handednessLabel}>
            {musicEnabled ? '🎵 Music On' : '🔇 Music Off'}
          </Text>
          <View style={[
            styles.toggleSwitch,
            musicEnabled && styles.toggleSwitchActive
          ]}>
            <View style={[
              styles.toggleKnob,
              musicEnabled && styles.toggleKnobActive
            ]} />
          </View>
        </Pressable>
        
      </Animated.View>
    </View>
  );
};

type EnhancedMenuProps = {
  onStart: () => void;
  leftHandedMode: boolean;
  onToggleHandedness: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  onShowLeaderboard: () => void;
};

const EnhancedMenu: React.FC<EnhancedMenuProps> = ({ onStart, leftHandedMode, onToggleHandedness, musicEnabled, onToggleMusic, onShowLeaderboard }) => {
  const [openId, setOpenId] = useState<string>("");
  const [animPhase, setAnimPhase] = useState(0);
  const menuStarsRef = useRef<Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}>>([]);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    // Initialize menu stars
    const stars: Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}> = [];
    const layers = [
      { count: 15, parallax: 0.3, size: 2, opacity: 0.4 },
      { count: 10, parallax: 0.6, size: 3, opacity: 0.6 },
      { count: 8, parallax: 0.9, size: 4, opacity: 0.8 },
    ];
    
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        stars.push({
          id: `menu-L${li}-${i}`,
          x: Math.random() * width,
          y: Math.random() * height,
          size: layer.size,
          parallax: layer.parallax,
          opacity: layer.opacity
        });
      }
    });
    menuStarsRef.current = stars;

    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 100);

      // Update star positions smoothly
      menuStarsRef.current.forEach(star => {
        star.y += star.parallax * 1.2; // Slightly faster movement to compensate for lower framerate
        if (star.y > height + 10) {
          star.y = -10;
          star.x = Math.random() * width;
        }
      });
    }, 50); // 20fps for all devices
    
    return () => clearInterval(interval);
  }, [width, height]);

  const handleToggle = (id: string) => {
    setOpenId(current => current === id ? "" : id);
  };

  const logoGlow = {
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8 + Math.sin(animPhase * 0.15) * 2,
  };

  const subtleFade = 0.85 + Math.sin(animPhase * 0.06) * 0.15; // Slightly more noticeable fade effect

  return (
    <View style={styles.menuContainer}>
      {/* Smooth background stars */}
      <View style={styles.menuParticles} pointerEvents="none">
        {menuStarsRef.current.map((star) => (
          <View
            key={star.id}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#8FB7FF', // Same blue as game stars
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {/* Logo treatment */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('./assets/pupilz-logo.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoSub}>
          ── POD DESCENT ──
        </Text>
        <View style={styles.logoUnderline} />
      </View>

      {/* Compact Settings */}
      <View style={styles.compactSettings}>
        <Pressable
          onPress={onToggleHandedness}
          style={[styles.compactSettingButton, { opacity: subtleFade }]}
        >
          <Text style={styles.compactSettingText}>
            {leftHandedMode ? '👈' : '👉'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleMusic}
          style={[styles.compactSettingButton, { opacity: subtleFade }]}
        >
          <Text style={styles.compactSettingText}>
            {musicEnabled ? '🎵' : '🔇'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.menuSubtitle}>
          • INFILTRATE EARTH'S ATMOSPHERE •{'\n'}• ESTABLISH DOMINANCE •
        </Text>
        
        <View style={styles.menuSections}>
          {MENU_SECTIONS.map((section) => (
            <AccordionItem
              key={section.id}
              section={section}
              isOpen={openId === section.id}
              onToggle={() => handleToggle(section.id)}
            />
          ))}
        </View>

        <View style={styles.socialButtonContainer}>
          <Pressable
            onPress={onShowLeaderboard}
            style={({ pressed }) => [
              styles.smallButton,
              styles.leaderboardButtonSmall,
              pressed && styles.smallButtonPressed,
              { opacity: subtleFade }
            ]}
          >
            <Text style={styles.smallButtonText}>🏆 TOP PILOTS</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open('https://pupilz.io/', '_blank');
              }
            }}
            style={({ pressed }) => [
              styles.smallButton,
              styles.websiteButtonSmall,
              pressed && styles.smallButtonPressed,
              { opacity: subtleFade }
            ]}
          >
            <Text style={styles.smallButtonText}>🌐 PUPILZ.IO</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open('https://x.com/ThePupilz', '_blank');
              }
            }}
            style={({ pressed }) => [
              styles.smallButton,
              styles.xButtonSmall,
              pressed && styles.smallButtonPressed,
              { opacity: subtleFade }
            ]}
          >
            <Text style={styles.smallButtonText}>🐦 FOLLOW X</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onStart}
          style={({ pressed }) => [
            styles.menuCTA,
            pressed && styles.menuCTAPressed,
            { opacity: subtleFade }
          ]}
        >
          <View style={styles.menuCTAGlow} />
          <Text style={styles.menuCTAText}>INVADE EARTH!</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

function Game() {
  // PWA and Telegram WebApp integration
  useFullScreenPWA();

  const { width, height } = useWindowDimensions();

  // TELEGRAM DEBUG: Add comprehensive logging for debugging
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('🔍 TELEGRAM DEBUG - Environment Check:');
      console.log('  - Window dimensions:', width, 'x', height);
      console.log('  - User agent:', navigator.userAgent);
      console.log('  - Is Telegram WebApp:', !!(window as any).Telegram?.WebApp);

      if ((window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        console.log('  - Telegram version:', tg.version);
        console.log('  - Is expanded:', tg.isExpanded);
        console.log('  - Viewport height:', tg.viewportHeight);
        console.log('  - Viewport stable height:', tg.viewportStableHeight);
        console.log('  - Platform:', tg.platform);
        console.log('  - Color scheme:', tg.colorScheme);
        console.log('  - Theme params:', tg.themeParams);
      }
    }
  }, [width, height]);
  const rawInsets = useSafeAreaInsets();
  // Safety fallback for insets to prevent undefined errors
  const insets = {
    top: rawInsets?.top || 0,
    bottom: rawInsets?.bottom || 0,
    left: rawInsets?.left || 0,
    right: rawInsets?.right || 0,
  };

  // Phase
  const [phase, _setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const setPhase = (p: Phase) => { phaseRef.current = p; _setPhase(p); };
  
  // AAA-Quality Smart Tip System - Comprehensive & Contextual
  const gameplayTips = {
    // Core survival (always relevant)
    survival: [
      { id: 'movement', text: '💫 Drag anywhere on screen to move your pod smoothly', priority: 'high' },
      { id: 'shields', text: '🛡️ Collect blue bubble shields (B) for protection - stack up to 6!', priority: 'high' },
      { id: 'invuln', text: '✨ After respawn, you have brief invulnerability - use it to escape danger!', priority: 'medium' },
      { id: 'corner_safety', text: '🏃 Screen corners are usually safer - retreat there when overwhelmed', priority: 'medium' },
      { id: 'prediction', text: '🎯 Watch enemy movement patterns - anticipate where they\'ll be', priority: 'medium' },
      { id: 'breathing_room', text: '💨 Don\'t hug the bottom edge - give yourself room to maneuver', priority: 'high' },
    ],

    // Control mastery
    controls: [
      { id: 'full_screen', text: '📱 You can control your pod from anywhere on the screen - use the full area!', priority: 'high' },
      { id: 'handedness', text: '👈👉 Switch left/right handed controls in menu or during respawn', priority: 'medium' },
      { id: 'smooth_movement', text: '🌊 Smooth, small movements are more effective than large jerky ones', priority: 'medium' },
      { id: 'multi_finger', text: '✋ Use inventory items while moving - the game supports multi-touch', priority: 'low' },
    ],

    // Power-up mastery  
    powerups: [
      { id: 'energy_priority', text: '🔋 Energy cells (E) are lifesavers: +3 shields + 3s invulnerability!', priority: 'critical' },
      { id: 'drone_bodyguard', text: '🤖 Drones (D) sacrifice themselves to save you - keep them close!', priority: 'high' },
      { id: 'nuke_smart_use', text: '💥 Nukes clear threats but spare power-ups - perfect for emergencies!', priority: 'medium' },
      { id: 'shield_stacking', text: '🛡️ Shield bubbles stack! Collect multiple for maximum protection', priority: 'high' },
      { id: 'rapid_fire_timing', text: '⚡ Rapid-fire (R) reduces weapon cooldown - grab it before tough sections!', priority: 'medium' },
    ],
    
    // Weapon mastery
    weapons: [
      { id: 'upgrade_hunt', text: '⚡ Hunt for weapon upgrades: Multi/Spread/Laser/Flame/Homing', priority: 'high' },
      { id: 'laser_power', text: '🔥 Laser (L) weapons pierce through multiple enemies - great for crowds!', priority: 'medium' },
      { id: 'homing_ships', text: '🎯 Homing missiles (H) prioritize enemy ships - perfect for evasive targets', priority: 'medium' },
      { id: 'multi_lanes', text: '🔫 Multi (M) weapons fire in multiple lanes - excellent for wide coverage', priority: 'medium' },
      { id: 'spread_burst', text: '💥 Spread (S) fires multiple pellets - devastating at close range', priority: 'medium' },
      { id: 'flame_area', text: '🔥 Flame (F) weapons excel at area damage - great for clusters', priority: 'medium' },
      { id: 'weapon_stacking', text: '📈 Collect the same weapon type multiple times to upgrade it!', priority: 'high' },
      { id: 'auto_fire', text: '🎯 Weapons auto-fire continuously - focus on movement and dodging', priority: 'high' },
    ],

    // Level progression & strategy
    progression: [
      { id: 'ship_quota', text: '🚀 Kill required ships each level to spawn the level-up ring', priority: 'critical' },
      { id: 'ring_timing', text: '⭕ Level rings float up from bottom - don\'t let them fall off the top!', priority: 'critical' },
      { id: 'level_difficulty', text: '📊 Each level requires more ship kills: 2→3→4→5→Boss', priority: 'high' },
      { id: 'boss_preparation', text: '👾 Level 5 = Boss fight! You\'ll get drone reinforcements + any shields/energy cells', priority: 'high' },
      { id: 'drone_reinforcements', text: '🤖 Mothership sends 3 drone reinforcements each level - they\'ll sacrifice themselves to save you!', priority: 'high' },
      { id: 'earth_ring_final', text: '🌍 After beating the boss, fly through the EARTH ring to win!', priority: 'critical' },
    ],

    // Pro tips & advanced tactics
    advanced: [
      { id: 'threat_prioritization', text: '🎯 Priority targets: Ships > Missiles > Asteroids > Barriers', priority: 'medium' },
      { id: 'safe_zones', text: '🛡️ Create safe zones by clearing one side, then work the other side', priority: 'medium' },
      { id: 'resource_conservation', text: '💾 Save energy cells and nukes for boss fight or emergencies', priority: 'medium' },
      { id: 'boss_pattern', text: '👾 Boss bounces predictably - learn the pattern to avoid damage', priority: 'high' },
      { id: 'inventory_position', text: '📱 Inventory appears in corners - won\'t block your movement space', priority: 'low' },
      { id: 'respawn_safety', text: '🔄 You respawn with temporary shields and invulnerability - use wisely!', priority: 'medium' },
    ],
    
    // Death-specific advice
    asteroids: [
      { id: 'asteroid_dodge', text: '🌪️ Asteroids move predictably - stay mobile and create escape routes', priority: 'high' },
      { id: 'asteroid_clear', text: '💥 Use spread weapons (S) or lasers (L) to clear asteroid fields efficiently', priority: 'medium' },
    ],
    
    barriers: [
      { id: 'barrier_gaps', text: '🚧 Look for gaps in barrier walls - sometimes patience beats firepower', priority: 'high' },
      { id: 'barrier_flame', text: '🔥 Flame weapons (F) excel at melting through barrier clusters', priority: 'medium' },
    ],
    
    enemies: [
      { id: 'enemy_dodge', text: '👾 Enemy projectiles are slow - side-step while maintaining forward pressure', priority: 'high' },
      { id: 'enemy_homing', text: '🎯 Use homing missiles (H) against evasive enemy ships', priority: 'medium' },
    ],
    
    earth_ring_missed: [
      { id: 'earth_ring_warning', text: '🌍 CRITICAL: EARTH rings shrink over time - fly to them immediately after boss defeat!', priority: 'critical' },
      { id: 'earth_ring_timing', text: '⏰ You have limited time to reach the EARTH ring - defeat the boss and move fast!', priority: 'high' },
      { id: 'earth_ring_positioning', text: '🎯 Stay close to the boss fight area to minimize travel time to EARTH ring', priority: 'medium' },
    ],
  };
  
  const getContextualTip = (): string => {
    // AAA-Quality Tip Selection Algorithm
    const allTips = [];
    
    // Base pool: Always include survival and controls for all players
    allTips.push(...gameplayTips.survival);
    allTips.push(...gameplayTips.controls);
    allTips.push(...gameplayTips.powerups);
    
    // Add progression tips for all players (critical game knowledge)
    allTips.push(...gameplayTips.progression);
    
    // Weapon tips - always relevant
    allTips.push(...gameplayTips.weapons);
    
    // Contextual death-specific tips (boosted priority)
    if (lastDeathCause.current && gameplayTips[lastDeathCause.current]) {
      const deathTips = gameplayTips[lastDeathCause.current];
      // Add death-specific tips multiple times for higher selection chance
      allTips.push(...deathTips, ...deathTips, ...deathTips);
    }
    
    // Advanced tips for experienced players
    if (livesLostThisSession.current >= 3) {
      allTips.push(...gameplayTips.advanced);
    }
    
    // Priority weighting: Critical and High priority tips get multiple entries
    const weightedTips = [];
    allTips.forEach(tip => {
      if (tip.priority === 'critical') {
        weightedTips.push(tip, tip, tip, tip); // 4x chance
      } else if (tip.priority === 'high') {
        weightedTips.push(tip, tip, tip); // 3x chance  
      } else if (tip.priority === 'medium') {
        weightedTips.push(tip, tip); // 2x chance
      } else {
        weightedTips.push(tip); // 1x chance
      }
    });
    
    // Filter out recently shown tips (but more lenient - only last 8 tips)
    const recentTips = Array.from(tipsShown.current).slice(-8);
    const availableTips = weightedTips.filter(tip => !recentTips.includes(tip.id));
    
    // If we filtered too much, just use all weighted tips
    const finalTips = availableTips.length > 0 ? availableTips : weightedTips;
    
    // Random selection
    const selectedTip = finalTips[Math.floor(Math.random() * finalTips.length)];
    
    // Track shown tips (but cap at 15 to prevent infinite growth)
    tipsShown.current.add(selectedTip.id);
    if (tipsShown.current.size > 15) {
      const oldestTip = Array.from(tipsShown.current)[0];
      tipsShown.current.delete(oldestTip);
    }
    
    return selectedTip.text;
  };
  
  // Enhanced respawn messaging based on session context
  const getRespawnMessage = () => {
    const isFirstLoss = livesLostThisSession.current === 1;
    const isLastLife = lives.current === 1;
    
    if (isFirstLoss) {
      return {
        title: "⚡ EMERGENCY ⚡ RESPAWN ⚡ INITIATED ⚡",
        message: "Don't worry, Pupil. The mothership is tracking your position. You'll be respawned in a safer location with temporary shields.",
        tip: currentDeathTip.current
      };
    } else if (isLastLife) {
      return {
        title: "⚠️ CRITICAL CONDITION - LAST LIFE ⚠️",
        message: "This is your final chance, Pupil. The mothership cannot risk another pod loss.",
        tip: "🛡️ EMERGENCY: Energy cells (E) give +3 shields + invulnerability - find one now!"
      };
    } else {
      const messages = [
        { title: "⚡ POD RECONSTRUCTED ⚡", message: "Emergency nanobots have rebuilt your pod. Respawning with backup systems." },
        { title: "⚡ BACKUP SYSTEMS ONLINE ⚡", message: "Secondary pod deployed. You're cleared for continued mission." },
        { title: "⚡ EMERGENCY TELEPORT ⚡", message: "Mothership engaged emergency extraction. Materializing in safe zone." }
      ];
      const selected = messages[Math.floor(Math.random() * messages.length)];
      return { ...selected, tip: currentDeathTip.current };
    }
  };
  
  const getCrashMessage = () => {
    if (lives.current > 1) {
      return "SYSTEM FAILURE!\nPod Lost...";
    } else if (lives.current === 1) {
      return "CRITICAL CONDITION! Last life remaining!";
    } else {
      return "MISSION FAILED!\nAll Pods Lost...";
    }
  };
  const crashMessage = useRef("POD DESTROYED!"); // Will be updated by getCrashMessage()

  const [timeSec, setTimeSec] = useState(0);
  const [, setTick] = useState(0);
  
  // Audio system
  const titleMusic = useRef<Audio.Sound | null>(null);
  const gameplayMusic = useRef<Audio.Sound | null>(null);
  const missionFailedMusic = useRef<Audio.Sound | null>(null);
  const earthReachedMusic = useRef<Audio.Sound | null>(null);
  const spaceBubblesSound = useRef<Audio.Sound | null>(null);
  const getItemSound = useRef<Audio.Sound | null>(null);
  const clearLevelSound = useRef<Audio.Sound | null>(null);
  const buttonPressSound = useRef<Audio.Sound | null>(null);
  const asteroidBreakingSound = useRef<Audio.Sound | null>(null);
  const gunCockingSound = useRef<Audio.Sound | null>(null);
  const respawnSound = useRef<Audio.Sound | null>(null);
  const weaponFireSound = useRef<Audio.Sound | null>(null);
  const useItemSound = useRef<Audio.Sound | null>(null);
  const laserGunSound = useRef<Audio.Sound | null>(null);
  const humanShipExplodeSound = useRef<Audio.Sound | null>(null);
  const multiGunSound = useRef<Audio.Sound | null>(null);
  const homingMissilesGunSound = useRef<Audio.Sound | null>(null);
  const fireGunSound = useRef<Audio.Sound | null>(null);
  const spreadGunSound = useRef<Audio.Sound | null>(null);
  const gameplayMusicPlaying = useRef(false); // Track if gameplay music is currently playing
  const userInteracted = useRef(false); // Track if user has interacted with the page
  const tickCounter = useRef(0); // For mobile performance optimization

  // Simple mobile detection for performance optimization
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEndDevice = false; // Disable for now to prevent crashes

  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [audioLoaded, setAudioLoaded] = useState(false);


  // Camera/world
  const scrollY = useRef(0);
  const worldV  = useRef(FREE_FALL);

  // Ring/level
  const level = useRef(1);
  const ringCenterY = useRef(0);
  const ringCenterX = useRef(0);
  const ringBaseR   = useRef(60);
  const ringSpawnT  = useRef(0);
  const bossGateCleared = useRef(false); // after boss dies for this ring
  const ringDisintegrated = useRef(false); // track if current ring has been disintegrated
  const ringOriginalText = useRef(""); // store original ring text to prevent change during disintegration
  const ringRespawnPending = useRef(false); // track if ring respawn is scheduled

  // HUD fade
  const hudFadeT = useRef(3.2); // seconds visible after notable event

  // Pod free-move (screen space) - direct position control
  const podX = useRef(width * 0.5);
  const podY = useRef(Math.round(height * 0.5)); // mid-screen starting position

  // Touch control state - trackpad style
  const touching = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const podStartX = useRef(0);
  const podStartY = useRef(0);

  // Weapons & toggles
  const nukesLeft = useRef(1);
  const leftHandedMode = useRef(false); // Accessibility: left-handed player support
  type Weapon = { kind: Exclude<PUKind,"R"|"B"|"E"|"T"|"D"|"N"> | "basic"; level: 1|2|3 };
  const weapon = useRef<Weapon>({ kind: "basic", level: 1 });
  const rapidLevel = useRef<0|1|2|3>(0);
  const lastShotTime = useRef(-999);

  // Shield lives + invuln
  const shieldLives = useRef(0);
  const invulnTime = useRef(0);

  // Time slow system
  const timeSlowRemaining = useRef(0);

  // Drones system
  const drones = useRef<Drone[]>([]);
  const droneDeployCD = useRef(0); // cooldown to prevent mass deployment

  // Energy Cells ("E")
  const energyCells = useRef(0);

  // Lives system
  const lives = useRef(3);
  const maxLives = 3;
  const respawnCountdown = useRef(0);
  const livesLostThisSession = useRef(0);
  
  // Ship-based progression system (HYBRID APPROACH)
  const shipsKilledThisLevel = useRef(0);
  const shipsRequiredForLevel = useRef(2); // Start with 2 ships for level 1->2
  const levelRingSpawned = useRef(false); // Track if ring has been spawned for current level
  const quotaJustMet = useRef(false); // Track when quota is first met for celebration
  const levelUpProcessed = useRef(false); // Prevent multiple levelUp calls per ring
  
  // Level advancement notifications
  const levelNotificationTimer = useRef(0);
  const levelNotificationText = useRef('');
  
  // Subtle acquisition notifications (when flying through rings)
  const acquisitionMessageTimer = useRef(0);
  const acquisitionMessageText = useRef('');
  const acquisitionMessageOpacity = useRef(0);
  
  // Ring animation for floating from bottom
  const ringFloatStartY = useRef(0);
  const ringFloatProgress = useRef(0); // 0-1 animation progress
  
  // User preferences for respawn experience
  const [showRespawnTips, setShowRespawnTips] = useState(true);
  const [quickRespawn, setQuickRespawn] = useState(false);
  const canSkipCountdown = useRef(false);
  
  // Advanced tip system
  const lastDeathCause = useRef<'asteroid' | 'barrier' | 'enemy' | 'boss' | 'ship' | 'earth_ring_missed' | null>(null);
  const deathStats = useRef({ asteroid: 0, barrier: 0, enemy: 0, boss: 0, ship: 0, earth_ring_missed: 0 });
  const tipsShown = useRef<Set<string>>(new Set());
  const currentDeathTip = useRef<string>(''); // Cache tip for current death

  // Entities
  const asteroids = useRef<Asteroid[]>([]);
  const barriers  = useRef<Barrier[]>([]);
  const powerups  = useRef<PowerUp[]>([]);
  const stars     = useRef<Star[]>([]);
  const projs     = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  const scorePopups = useRef<ScorePopup[]>([]);

  // Enemies
  const ships = useRef<EnemyShip[]>([]);
  const enemyProjs = useRef<EnemyProj[]>([]);
  const boss = useRef<Boss>({ active: false, x: 0, y: 0, vx: 85, vy: 70, hp: 0, hpMax: 0, fireT: 1.0, pattern: 0 });

  // FX
  const shakeT = useRef(0);
  const shakeMag = useRef(0);
  const flashTime = useRef(0);
  const crashFlashTime = useRef(0); // Separate flash timer for crashes
  
  // Victory beam-up sequence
  const victoryBeamActive = useRef(false);
  const victoryBeamProgress = useRef(0); // 0 to 1 over 2 seconds
  const podVictoryY = useRef(0); // Pod Y during beam-up
  const podVictoryScale = useRef(1); // Pod scale during beam-up
  const finalDeathSequence = useRef(false); // Track final death to hide pod
  
  // Simple game start messaging
  const gameStartMessageTimer = useRef(0);
  const gameStartMessageText = useRef("");
  

  // Nuke sweep
  const sweepActive = useRef(false);
  const sweepR = useRef(0);

  // Spawn cursors
  const nextAstY = useRef(0);
  const nextBarY = useRef(0);
  const nextPwrY = useRef(0);
  const nextShipY = useRef(0);

  // AAA Scoring System
  const currentScore = useRef(0);
  const sessionStartTime = useRef(0);

  // AAA Leaderboard System State
  const [leaderboardState, setLeaderboardState] = useState<LeaderboardState>(() => LeaderboardManager.getDefaultState());
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [gameResultData, setGameResultData] = useState<{score: number; level: number; victory: boolean} | null>(null);

  // Load leaderboard and detect Telegram user on component mount
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const state = await LeaderboardManager.loadLeaderboard();
        setLeaderboardState(state);
        setLeaderboardLoaded(true);
      } catch (error) {
        console.warn('Failed to load leaderboard:', error);
        setLeaderboardLoaded(true); // Still set loaded to prevent infinite loading
      }
    };

    const detectTelegramUser = () => {
      try {
        // Check if running in Telegram WebApp
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          const tg = (window as any).Telegram.WebApp;
          console.log('🔍 Telegram WebApp detected, checking user data...');

          // Don't call ready() here - useFullScreenPWA hook already handles Telegram initialization

          const user = tg.initDataUnsafe?.user;

          if (user && (user.username || user.first_name)) {
            // Use username if available, otherwise use first_name
            const username = user.username || user.first_name || 'Player';
            console.log('🤖 Detected Telegram user:', username);
            setTelegramUsername(username);
            setPlayerName(username.toUpperCase().slice(0, 8)); // Allow up to 8 chars for usernames
          } else {
            console.log('🔍 No Telegram user data available');
          }
        } else {
          console.log('🌐 Not running in Telegram WebApp');
        }
      } catch (error) {
        console.error('❌ Error detecting Telegram user:', error);
        // Don't let Telegram detection errors break the app
      }
    };

    loadLeaderboard();

    // Delay Telegram detection to ensure WebApp is fully initialized by useFullScreenPWA
    setTimeout(() => {
      detectTelegramUser();
    }, 500); // Increased delay to let useFullScreenPWA complete initialization
  }, []);

  // Legacy kill counters (for stats/debugging)
  const killsAst = useRef(0);
  const killsBar = useRef(0);
  const killsShip = useRef(0);

  // Loop timing
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  /* ----- Setup helpers ----- */
  const currentRingRadius = () => {
    const age = Math.max(0, timeSec - ringSpawnT.current);
    const shrink = Math.max(RING_MIN_FRACTION, 1 - RING_SHRINK_RATE * age);
    return ringBaseR.current * shrink;
  };

  // AAA Scoring System Functions
  const addScore = (points: number, source?: string) => {
    console.log(`🎯 Adding ${points} points from ${source} (Before: ${currentScore.current})`);
    currentScore.current += points;
    console.log(`🎯 Score now: ${currentScore.current}`);
    if (points < 0) {
      console.warn(`⚠️ NEGATIVE POINTS DETECTED! ${points} from ${source}`);
      console.trace(); // Show stack trace for negative scores
    }
  };

  const scoreAsteroidKill = (asteroid: Asteroid) => {
    const points = calculateEnemyScore('asteroid', asteroid.type, asteroid.r, level.current);
    addScore(points, `${asteroid.type} asteroid`);
    spawnScorePopup(asteroid.x, asteroid.y, points);
    killsAst.current += 1;
  };

  const scoreBarrierKill = (barrier: Barrier) => {
    const points = calculateEnemyScore('barrier', barrier.type, Math.max(barrier.w, barrier.h), level.current);
    addScore(points, `${barrier.type} barrier`);
    spawnScorePopup(barrier.x + barrier.w/2, barrier.y + barrier.h/2, points);
    killsBar.current += 1;
  };

  const scoreShipKill = (ship: EnemyShip) => {
    const points = calculateEnemyScore('ship', ship.kind, 20, level.current);
    addScore(points, `${ship.kind} ship`);
    spawnScorePopup(ship.x, ship.y, points);
    killsShip.current += 1;
  };

  const scoreBossKill = () => {
    const points = calculateEnemyScore('boss', 'boss', 50, level.current);
    addScore(points, 'boss defeated');
    spawnScorePopup(boss.current.x, boss.current.y, points);
  };

  const scoreLevelComplete = () => {
    const points = SCORING_CONFIG.bonuses.levelComplete * level.current;
    addScore(points, `level ${level.current} complete`);
    // Show score popup at ring center
    spawnScorePopup(ringCenterX.current, ringCenterY.current, points);
  };

  const calculateFinalScore = () => {
    console.log(`🔍 FINAL SCORE DEBUG - Starting score: ${currentScore.current}`);
    console.log(`🔍 Time: ${timeSec}, SessionStart: ${sessionStartTime.current}, Lives: ${lives.current}, Level: ${level.current}`);

    // Add survival bonus
    const survivalTime = Math.floor(timeSec - sessionStartTime.current);
    const survivalPoints = survivalTime * SCORING_CONFIG.bonuses.survival;
    console.log(`🔍 Survival: ${survivalTime}s * ${SCORING_CONFIG.bonuses.survival} = ${survivalPoints}`);
    addScore(survivalPoints, `${survivalTime}s survival`);

    // Add life bonus
    const lifePoints = lives.current * SCORING_CONFIG.bonuses.lifeBonus;
    console.log(`🔍 Life bonus: ${lives.current} lives * ${SCORING_CONFIG.bonuses.lifeBonus} = ${lifePoints}`);
    if (lifePoints > 0) {
      addScore(lifePoints, `${lives.current} lives remaining`);
    }

    // Add victory bonus if won
    if (level.current >= 5) {
      console.log(`🔍 Victory bonus: ${SCORING_CONFIG.bonuses.victoryBonus}`);
      addScore(SCORING_CONFIG.bonuses.victoryBonus, 'victory bonus');
    }

    console.log(`🔍 FINAL SCORE DEBUG - End score: ${currentScore.current}`);
    return currentScore.current;
  };

  // AAA Leaderboard Integration Functions
  const checkLeaderboardQualification = async (score: number, level: number, victory: boolean) => {
    if (LeaderboardManager.qualifiesForLeaderboard(score, leaderboardState.entries)) {
      console.log(`🏆 Score ${score} qualifies for leaderboard!`);

      // If we have Telegram username, auto-submit without showing name entry
      if (telegramUsername && playerName) {
        console.log(`🤖 Auto-submitting with Telegram username: ${playerName}`);
        try {
          const { newState, rank } = await LeaderboardManager.addEntry(
            leaderboardState,
            playerName,
            score,
            level,
            victory
          );
          setLeaderboardState(newState);
          console.log(`🎯 Auto-added "${playerName}" to leaderboard at rank ${rank}!`);
        } catch (error) {
          console.error('Failed to auto-submit score:', error);
          // Fall back to manual entry
          setGameResultData({ score, level, victory });
          setShowNameEntry(true);
        }
      } else {
        // No Telegram username, show manual entry
        setGameResultData({ score, level, victory });
        setShowNameEntry(true);
      }
    } else {
      console.log(`📊 Score ${score} doesn't qualify for leaderboard (minimum: 100)`);
    }
  };

  const handleNameSubmit = async () => {
    const trimmedName = playerName.trim();
    if (!gameResultData || !trimmedName) return;

    try {
      const { newState, rank } = await LeaderboardManager.addEntry(
        leaderboardState,
        trimmedName,
        gameResultData.score,
        gameResultData.level,
        gameResultData.victory
      );

      setLeaderboardState(newState);
      setShowNameEntry(false);
      setPlayerName("");
      setGameResultData(null);

      console.log(`🎯 Added "${trimmedName}" to leaderboard at rank ${rank}!`);
    } catch (error) {
      console.error('Failed to submit score:', error);
      // Could show error message to user here
    }
  };

  const handleSkipLeaderboard = () => {
    setShowNameEntry(false);
    setPlayerName("");
    setGameResultData(null);
  };

  // Audio system functions
  const loadTitleMusic = async () => {
    try {
      if (titleMusic.current) {
        await titleMusic.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Title-Track.wav'),
        {
          isLooping: true,
          volume: musicVolume,
        }
      );
      titleMusic.current = sound;
      console.log('🎵 Title music loaded');
    } catch (error) {
      console.log('❌ Failed to load title music:', error);
    }
  };

  const loadGameplayMusic = async () => {
    try {
      if (gameplayMusic.current) {
        await gameplayMusic.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz_gameplay_Loopedx4.mp3'),
        {
          isLooping: true,
          volume: musicVolume,
        }
      );
      gameplayMusic.current = sound;
      console.log('🎵 Gameplay music loaded');
    } catch (error) {
      console.log('❌ Failed to load gameplay music:', error);
    }
  };

  const loadMissionFailedMusic = async () => {
    try {
      if (missionFailedMusic.current) {
        await missionFailedMusic.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz_mission_failed.mp3'),
        {
          isLooping: true,
          volume: musicVolume,
        }
      );
      missionFailedMusic.current = sound;
      console.log('🎵 Mission failed music loaded');
    } catch (error) {
      console.log('❌ Failed to load mission failed music:', error);
    }
  };

  const loadEarthReachedMusic = async () => {
    try {
      if (earthReachedMusic.current) {
        await earthReachedMusic.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz_earth_reached.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      earthReachedMusic.current = sound;
      console.log('🎵 Earth reached music loaded');
    } catch (error) {
      console.log('❌ Failed to load earth reached music:', error);
    }
  };

  const loadSpaceBubblesSound = async () => {
    try {
      if (spaceBubblesSound.current) {
        await spaceBubblesSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/space-bubbles.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      spaceBubblesSound.current = sound;
      console.log('🔊 Space bubbles sound loaded');
    } catch (error) {
      console.log('❌ Failed to load space bubbles sound:', error);
    }
  };

  const loadGetItemSound = async () => {
    try {
      if (getItemSound.current) {
        await getItemSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-get-item.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      getItemSound.current = sound;
      console.log('🔊 Get item sound loaded');
    } catch (error) {
      console.log('❌ Failed to load get item sound:', error);
    }
  };

  const loadClearLevelSound = async () => {
    try {
      if (clearLevelSound.current) {
        await clearLevelSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-clear-level.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      clearLevelSound.current = sound;
      console.log('🔊 Clear level sound loaded');
    } catch (error) {
      console.log('❌ Failed to load clear level sound:', error);
    }
  };

  const loadButtonPressSound = async () => {
    try {
      if (buttonPressSound.current) {
        await buttonPressSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-Button-Press.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      buttonPressSound.current = sound;
      console.log('🔊 Button press sound loaded');
    } catch (error) {
      console.log('❌ Failed to load button press sound:', error);
    }
  };

  const loadAsteroidBreakingSound = async () => {
    try {
      if (asteroidBreakingSound.current) {
        await asteroidBreakingSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-astroid-breaking.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      asteroidBreakingSound.current = sound;
      console.log('🔊 Asteroid breaking sound loaded');
    } catch (error) {
      console.log('❌ Failed to load asteroid breaking sound:', error);
    }
  };

  const loadGunCockingSound = async () => {
    try {
      if (gunCockingSound.current) {
        await gunCockingSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-gun-cocking.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      gunCockingSound.current = sound;
      console.log('🔊 Gun cocking sound loaded');
    } catch (error) {
      console.log('❌ Failed to load gun cocking sound:', error);
    }
  };

  const loadRespawnSound = async () => {
    try {
      if (respawnSound.current) {
        await respawnSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz_respawn.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      respawnSound.current = sound;
      console.log('🔊 Respawn sound loaded');
    } catch (error) {
      console.log('❌ Failed to load respawn sound:', error);
    }
  };

  const loadWeaponFireSound = async () => {
    try {
      if (weaponFireSound.current) {
        await weaponFireSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/weapon-fire.wav'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      weaponFireSound.current = sound;
      console.log('🔊 Weapon fire sound loaded');
    } catch (error) {
      console.log('❌ Failed to load weapon fire sound:', error);
    }
  };

  const loadUseItemSound = async () => {
    try {
      if (useItemSound.current) {
        await useItemSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-use-item.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      useItemSound.current = sound;
      console.log('🔊 Use item sound loaded');
    } catch (error) {
      console.log('❌ Failed to load use item sound:', error);
    }
  };

  const loadLaserGunSound = async () => {
    try {
      if (laserGunSound.current) {
        await laserGunSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-Laser-gun.mp3'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      laserGunSound.current = sound;
      console.log('🔊 Laser gun sound loaded');
    } catch (error) {
      console.log('❌ Failed to load laser gun sound:', error);
    }
  };

  const loadHumanShipExplodeSound = async () => {
    try {
      if (humanShipExplodeSound.current) {
        await humanShipExplodeSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-human-ship-explode.wav'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      humanShipExplodeSound.current = sound;
      console.log('🔊 Human ship explode sound loaded');
    } catch (error) {
      console.log('❌ Failed to load human ship explode sound:', error);
    }
  };

  const loadMultiGunSound = async () => {
    try {
      if (multiGunSound.current) {
        await multiGunSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-multi-gun.wav'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      multiGunSound.current = sound;
      console.log('🔊 Multi gun sound loaded');
    } catch (error) {
      console.log('❌ Failed to load multi gun sound:', error);
    }
  };

  const loadHomingMissilesGunSound = async () => {
    try {
      if (homingMissilesGunSound.current) {
        await homingMissilesGunSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-homing-missles-gun.wav'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      homingMissilesGunSound.current = sound;
      console.log('🔊 Homing missiles gun sound loaded');
    } catch (error) {
      console.log('❌ Failed to load homing missiles gun sound:', error);
    }
  };

  const loadFireGunSound = async () => {
    try {
      if (fireGunSound.current) {
        await fireGunSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-fire-gun.wav'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      fireGunSound.current = sound;
      console.log('🔊 Fire gun sound loaded');
    } catch (error) {
      console.log('❌ Failed to load fire gun sound:', error);
    }
  };

  const loadSpreadGunSound = async () => {
    try {
      if (spreadGunSound.current) {
        await spreadGunSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/audio/Pupilz-spread-gun.wav'),
        {
          isLooping: false,
          volume: musicVolume,
        }
      );
      spreadGunSound.current = sound;
      console.log('🔊 Spread gun sound loaded');
    } catch (error) {
      console.log('❌ Failed to load spread gun sound:', error);
    }
  };

  const playTitleMusic = async () => {
    try {
      if (titleMusic.current && musicEnabled) {
        await titleMusic.current.setVolumeAsync(musicVolume);
        await titleMusic.current.playAsync();
        console.log('🎵 Title music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play title music:', error);
    }
  };

  const stopTitleMusic = async () => {
    try {
      if (titleMusic.current) {
        await titleMusic.current.pauseAsync();
        console.log('🎵 Title music stopped');
      }
    } catch (error) {
      console.log('❌ Failed to stop title music:', error);
    }
  };

  const updateMusicVolume = async (volume: number) => {
    try {
      if (titleMusic.current) {
        await titleMusic.current.setVolumeAsync(musicEnabled ? volume : 0);
      }
    } catch (error) {
      console.log('❌ Failed to set music volume:', error);
    }
  };

  const stopAllMusic = async () => {
    try {
      if (titleMusic.current) {
        await titleMusic.current.pauseAsync();
      }
      if (gameplayMusic.current) {
        await gameplayMusic.current.pauseAsync();
      }
      if (missionFailedMusic.current) {
        await missionFailedMusic.current.pauseAsync();
      }
      if (earthReachedMusic.current) {
        await earthReachedMusic.current.pauseAsync();
      }
      gameplayMusicPlaying.current = false; // Track that gameplay music stopped
      console.log('🎵 All music stopped');
    } catch (error) {
      console.log('❌ Failed to stop all music:', error);
    }
  };

  const playMissionFailedMusic = async () => {
    try {
      // First stop all other music
      await stopAllMusic();

      if (missionFailedMusic.current && musicEnabled) {
        await missionFailedMusic.current.setPositionAsync(0); // Reset to beginning
        await missionFailedMusic.current.setVolumeAsync(musicVolume);
        await missionFailedMusic.current.playAsync();
        console.log('🎵 Mission failed music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play mission failed music:', error);
    }
  };

  const playEarthReachedMusic = async () => {
    try {
      // First stop all other music
      await stopAllMusic();

      if (earthReachedMusic.current && musicEnabled) {
        await earthReachedMusic.current.setPositionAsync(0); // Reset to beginning
        await earthReachedMusic.current.setVolumeAsync(musicVolume);
        await earthReachedMusic.current.playAsync();
        console.log('🎵 Earth reached music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play earth reached music:', error);
    }
  };

  const playSpaceBubblesSound = async () => {
    try {
      if (spaceBubblesSound.current && musicEnabled) {
        await spaceBubblesSound.current.setPositionAsync(0); // Reset to beginning
        await spaceBubblesSound.current.setVolumeAsync(musicVolume);
        await spaceBubblesSound.current.playAsync();
        console.log('🔊 Space bubbles sound playing for mothership beam-up');
      }
    } catch (error) {
      console.log('❌ Failed to play space bubbles sound:', error);
    }
  };

  const playGetItemSound = async () => {
    try {
      if (getItemSound.current && musicEnabled) {
        await getItemSound.current.setPositionAsync(0); // Reset to beginning
        await getItemSound.current.setVolumeAsync(musicVolume);
        await getItemSound.current.playAsync();
        console.log('🔊 Get item sound playing for inventory pickup');
      }
    } catch (error) {
      console.log('❌ Failed to play get item sound:', error);
    }
  };

  const playClearLevelSound = async () => {
    try {
      if (clearLevelSound.current && musicEnabled) {
        await clearLevelSound.current.setPositionAsync(0); // Reset to beginning
        await clearLevelSound.current.setVolumeAsync(musicVolume);
        await clearLevelSound.current.playAsync();
        console.log('🔊 Clear level sound playing for level ring pop');
      }
    } catch (error) {
      console.log('❌ Failed to play clear level sound:', error);
    }
  };

  const playButtonPressSound = async () => {
    try {
      if (buttonPressSound.current && musicEnabled) {
        await buttonPressSound.current.setPositionAsync(0); // Reset to beginning
        await buttonPressSound.current.setVolumeAsync(musicVolume);
        await buttonPressSound.current.playAsync();
        console.log('🔊 Button press sound playing for UI interaction');
      }
    } catch (error) {
      console.log('❌ Failed to play button press sound:', error);
    }
  };

  const playAsteroidBreakingSound = async () => {
    try {
      if (asteroidBreakingSound.current && musicEnabled) {
        await asteroidBreakingSound.current.setPositionAsync(0); // Reset to beginning
        await asteroidBreakingSound.current.setVolumeAsync(musicVolume);
        await asteroidBreakingSound.current.playAsync();
        console.log('🔊 Asteroid breaking sound playing for debris explosion');
      }
    } catch (error) {
      console.log('❌ Failed to play asteroid breaking sound:', error);
    }
  };

  const playGunCockingSound = async () => {
    try {
      if (gunCockingSound.current && musicEnabled) {
        await gunCockingSound.current.setPositionAsync(0); // Reset to beginning
        await gunCockingSound.current.setVolumeAsync(musicVolume);
        await gunCockingSound.current.playAsync();
        console.log('🔊 Gun cocking sound playing for weapon upgrade pickup');
      }
    } catch (error) {
      console.log('❌ Failed to play gun cocking sound:', error);
    }
  };

  const playRespawnSound = async () => {
    try {
      if (respawnSound.current && musicEnabled) {
        await respawnSound.current.setPositionAsync(0); // Reset to beginning
        await respawnSound.current.setVolumeAsync(musicVolume);
        await respawnSound.current.playAsync();
        console.log('🔊 Respawn sound playing for pod respawn');
      }
    } catch (error) {
      console.log('❌ Failed to play respawn sound:', error);
    }
  };

  const playWeaponFireSound = async () => {
    try {
      if (weaponFireSound.current && musicEnabled) {
        await weaponFireSound.current.setPositionAsync(0); // Reset to beginning
        await weaponFireSound.current.setVolumeAsync(musicVolume);
        await weaponFireSound.current.playAsync();
        console.log('🔊 Weapon fire sound playing for basic weapon');
      }
    } catch (error) {
      console.log('❌ Failed to play weapon fire sound:', error);
    }
  };

  const playUseItemSound = async () => {
    try {
      if (useItemSound.current && musicEnabled) {
        await useItemSound.current.setPositionAsync(0); // Reset to beginning
        await useItemSound.current.setVolumeAsync(musicVolume);
        await useItemSound.current.playAsync();
        console.log('🔊 Use item sound playing for inventory item usage');
      }
    } catch (error) {
      console.log('❌ Failed to play use item sound:', error);
    }
  };

  const playLaserGunSound = async () => {
    try {
      if (laserGunSound.current && musicEnabled) {
        await laserGunSound.current.setPositionAsync(0); // Reset to beginning
        await laserGunSound.current.setVolumeAsync(musicVolume);
        await laserGunSound.current.playAsync();
        console.log('🔊 Laser gun sound playing for laser weapon fire');
      }
    } catch (error) {
      console.log('❌ Failed to play laser gun sound:', error);
    }
  };

  const playHumanShipExplodeSound = async () => {
    try {
      if (humanShipExplodeSound.current && musicEnabled) {
        await humanShipExplodeSound.current.setPositionAsync(0); // Reset to beginning
        await humanShipExplodeSound.current.setVolumeAsync(musicVolume);
        await humanShipExplodeSound.current.playAsync();
        console.log('🔊 Human ship explode sound playing for ship/pod explosion');
      }
    } catch (error) {
      console.log('❌ Failed to play human ship explode sound:', error);
    }
  };

  const playMultiGunSound = async () => {
    try {
      if (multiGunSound.current && musicEnabled) {
        await multiGunSound.current.setPositionAsync(0); // Reset to beginning
        await multiGunSound.current.setVolumeAsync(musicVolume);
        await multiGunSound.current.playAsync();
        console.log('🔊 Multi gun sound playing for M weapon fire');
      }
    } catch (error) {
      console.log('❌ Failed to play multi gun sound:', error);
    }
  };

  const playHomingMissilesGunSound = async () => {
    try {
      if (homingMissilesGunSound.current && musicEnabled) {
        await homingMissilesGunSound.current.setPositionAsync(0); // Reset to beginning
        await homingMissilesGunSound.current.setVolumeAsync(musicVolume);
        await homingMissilesGunSound.current.playAsync();
        console.log('🔊 Homing missiles gun sound playing for H weapon fire');
      }
    } catch (error) {
      console.log('❌ Failed to play homing missiles gun sound:', error);
    }
  };

  const playFireGunSound = async () => {
    try {
      if (fireGunSound.current && musicEnabled) {
        await fireGunSound.current.setPositionAsync(0); // Reset to beginning
        await fireGunSound.current.setVolumeAsync(musicVolume);
        await fireGunSound.current.playAsync();
        console.log('🔊 Fire gun sound playing for F weapon fire');
      }
    } catch (error) {
      console.log('❌ Failed to play fire gun sound:', error);
    }
  };

  const playSpreadGunSound = async () => {
    try {
      if (spreadGunSound.current && musicEnabled) {
        await spreadGunSound.current.setPositionAsync(0); // Reset to beginning
        await spreadGunSound.current.setVolumeAsync(musicVolume);
        await spreadGunSound.current.playAsync();
        console.log('🔊 Spread gun sound playing for S weapon fire');
      }
    } catch (error) {
      console.log('❌ Failed to play spread gun sound:', error);
    }
  };

  // Check if EARTH ring has fallen off top of screen - MISSION FAILURE
  const checkEarthRingFailure = () => {
    if (level.current === 5 && bossGateCleared.current && ringSpawnT.current > 0) {
      const ringScreenY = yToScreen(ringCenterY.current);
      const ringOffScreen = ringScreenY < -100; // Ring has fallen off top of screen
      
      if (ringOffScreen) {
        console.log(`EARTH RING MISSED! Ring fell off screen at Y=${ringScreenY.toFixed(1)}`);
        crashMessage.current = "MISSION FAILED - EARTH RING MISSED!";
        killPlayer('earth_ring_missed');
        return true;
      }
    }
    return false;
  };

  // Check if level ring has fallen off top of screen and needs to respawn
  const checkLevelRingMissed = () => {
    if (ringSpawnT.current > 0 && level.current < 5 && !boss.current.active && !ringRespawnPending.current) {
      const ringScreenY = yToScreen(ringCenterY.current);
      const ringOffScreen = ringScreenY < -100; // Ring has fallen off top of screen
      
      if (ringOffScreen) {
        console.log(`Level ring fell off screen! Respawning in 4 seconds...`);
        ringSpawnT.current = 0; // Hide current ring
        ringRespawnPending.current = true; // Mark respawn as pending
        
        // Schedule respawn after 4 seconds
        setTimeout(() => {
          console.log(`Attempting to respawn level ring - phase: ${phase}, level: ${level.current}`);
          if (level.current < 5) {
            console.log(`Respawning level ring for level ${level.current + 1} from bottom of screen`);
            ringRespawnPending.current = false;
            startRingFloatAnimation();
          } else {
            console.log(`Respawn blocked - level: ${level.current} >= 5`);
            ringRespawnPending.current = false;
          }
        }, 4000);
        
        return true;
      }
    }
    return false;
  };

  const seedStars = () => {
    const s: Star[] = [];
    STAR_LAYERS.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        s.push({ id: `L${li}-${i}`, x: rand(0, width), y: rand(0, height), size: layer.size, parallax: layer.parallax, opacity: layer.opacity });
      }
    });
    stars.current = s;
  };

  const getAsteroidTypeData = (type: AsteroidType) => {
    switch (type) {
      case "rock":
        return { hpMult: 1.0, sizeMult: 1.0, speedMult: 1.0, color: "#7E8799", border: "#3E4654", damageColor: "#B91C1C" };
      case "metal":
        return { hpMult: 2.0, sizeMult: 0.8, speedMult: 0.7, color: "#9BACC7", border: "#4A5568", damageColor: "#DC2626" };
      case "crystal":
        return { hpMult: 0.6, sizeMult: 1.2, speedMult: 1.3, color: "#A78BFA", border: "#6D28D9", damageColor: "#EF4444" };
      case "debris":
        return { hpMult: 0.4, sizeMult: 0.6, speedMult: 1.5, color: "#DC8B47", border: "#8B4513", damageColor: "#F87171" };
      case "wreckage":
        return { hpMult: 1.5, sizeMult: 1.4, speedMult: 0.6, color: "#6B7280", border: "#374151", damageColor: "#B91C1C" };
    }
  };

  const getAsteroidDamageColor = (asteroid: Asteroid) => {
    const healthPercent = asteroid.hp / asteroid.maxHp;
    const typeData = getAsteroidTypeData(asteroid.type);
    
    if (healthPercent > 0.7) {
      return typeData.color; // Healthy - original color
    } else if (healthPercent > 0.4) {
      // Mix original color with red (moderate damage)
      return typeData.color.replace(/^#/, '') === typeData.color.slice(1) ? 
             `#${Math.floor(parseInt(typeData.color.slice(1, 3), 16) * 0.7 + parseInt('B9', 16) * 0.3).toString(16).padStart(2, '0')}${Math.floor(parseInt(typeData.color.slice(3, 5), 16) * 0.7 + parseInt('1C', 16) * 0.3).toString(16).padStart(2, '0')}${Math.floor(parseInt(typeData.color.slice(5, 7), 16) * 0.7 + parseInt('1C', 16) * 0.3).toString(16).padStart(2, '0')}` : 
             typeData.damageColor;
    } else {
      return typeData.damageColor; // Heavy damage - red
    }
  };

  const seedAsteroid = (id: number, worldY: number): Asteroid => {
    // Weighted random asteroid type selection
    const typeWeights = {
      rock: 40,      // Most common
      metal: 20,     // Tough
      crystal: 15,   // Fast but fragile
      debris: 15,    // Small and fast
      wreckage: 10   // Large but slow
    };
    
    const total = Object.values(typeWeights).reduce((a, b) => a + b, 0);
    let rand_val = Math.random() * total;
    let selectedType: AsteroidType = "rock";
    
    for (const [type, weight] of Object.entries(typeWeights)) {
      rand_val -= weight;
      if (rand_val <= 0) {
        selectedType = type as AsteroidType;
        break;
      }
    }
    
    const typeData = getAsteroidTypeData(selectedType);
    const baseRadius = rand(AST_MIN_R, AST_MAX_R);
    const r = Math.round(baseRadius * typeData.sizeMult);
    const baseHP = Math.max(1, Math.round((r / 20) * 3)); // Scale with size
    const hp = Math.round(baseHP * typeData.hpMult);
    
    return { 
      id, 
      x: rand(r + 10, width - r - 10), 
      y: worldY, 
      vx: rand(-AST_MAX_VX, AST_MAX_VX) * typeData.speedMult, 
      vy: AST_REL_VY * (Math.random() * 0.6 + 0.7) * typeData.speedMult,
      r,
      type: selectedType,
      hp,
      maxHp: hp,
      lastHit: 0
    };
  };

  const getBarrierTypeData = (type: BarrierType) => {
    switch (type) {
      case "metal":
        return { hpMult: 1.5, color: "#C04E4E", border: "#7A2F2F", height: BAR_H };
      case "energy":
        return { hpMult: 1.0, color: "#9333EA", border: "#5B21B6", height: BAR_H * 1.2 };
      case "asteroid":
        return { hpMult: 2.0, color: "#78716C", border: "#44403C", height: BAR_H * 0.8 };
      case "debris":
        return { hpMult: 0.8, color: "#EA580C", border: "#C2410C", height: BAR_H * 0.6 };
    }
  };

  const seedBarrier = (id: number, worldY: number): Barrier => {
    // Weighted barrier types
    const barrierTypes: BarrierType[] = ["metal", "energy", "asteroid", "debris"];
    const weights = [40, 25, 20, 15];
    
    const total = weights.reduce((a, b) => a + b, 0);
    let rand_val = Math.random() * total;
    let selectedType: BarrierType = "metal";
    
    for (let i = 0; i < barrierTypes.length; i++) {
      rand_val -= weights[i];
      if (rand_val <= 0) {
        selectedType = barrierTypes[i];
        break;
      }
    }
    
    const typeData = getBarrierTypeData(selectedType);
    const wv = rand(BAR_W_MIN, BAR_W_MAX);
    const baseHP = Math.max(2, Math.round((wv / 50) * 3));
    const hp = Math.round(baseHP * typeData.hpMult);
    
    return { 
      id, 
      x: rand(10, width - 10 - wv), 
      y: worldY, 
      w: wv, 
      h: typeData.height, 
      vx: Math.random() < 0.5 ? -BAR_VX : BAR_VX, 
      vy: BAR_REL_VY * (Math.random() * 0.6 + 0.7),
      type: selectedType,
      hp,
      maxHp: hp,
      lastHit: 0
    };
  };

  const seedPowerUp = (id: number, worldY: number): PowerUp => {
    // Base power-ups available at all levels
    const baseBag: PUKind[] = ["S","M","L","F","H","R","B","E","T","D"];
    
    // Nuke availability: Only after Level 2 (skill mastery first)
    const nukeChance = level.current >= 3 ? 0.08 : 0; // 8% chance after Level 2
    
    // Roll for nuke first (if available)
    if (nukeChance > 0 && Math.random() < nukeChance) {
      return { id, x: rand(22, width - 22), y: worldY, kind: "N", vy: 15 + Math.random() * 20 };
    }
    
    // Regular power-up selection
    const kind = baseBag[Math.floor(Math.random() * baseBag.length)];
    return { id, x: rand(22, width - 22), y: worldY, kind, vy: 15 + Math.random() * 20 };
  };

  const seedShip = (id: number, worldY: number): EnemyShip => {
    const kind: EnemyShip["kind"] = Math.random() < 0.55 ? "scout" : "fighter";
    const hp = kind === "scout" ? (2 + Math.max(0, level.current - 1)) : (4 + Math.max(0, level.current) * 1.2);
    return {
      id,
      x: rand(28, width - 28),
      y: worldY,
      vx: (Math.random() < 0.5 ? -1 : 1) * rand(40, 80),
      vy: rand(26, 46),
      hp: Math.round(hp),
      fireCD: rand(0.8, 1.6),
      kind,
    };
  };

  const ringBaseRadiusForLevel = () => {
    // Comfortable size for "LVL 10", shrinks a bit with level but stays readable
    const start = Math.min(110, Math.max(74, Math.round(width * 0.22)));
    const perLevelTrim = Math.max(0, (level.current - 1) * 1.5);
    return Math.max(58, start - perLevelTrim);
  };

  const spawnRingAt = (worldY: number, isNewLevel = false) => {
    ringCenterY.current = worldY;
    ringBaseR.current = ringBaseRadiusForLevel();
    ringCenterX.current = rand(ringBaseR.current + 14, width - ringBaseR.current - 14);
    // Ensure ring always has a valid spawn time (use minimum of 0.1 seconds)
    ringSpawnT.current = Math.max(0.1, timeSec);
    console.log(`spawnRingAt: ringSpawnT set to ${ringSpawnT.current} (timeSec: ${timeSec})`);
    // Only reset boss gate for NEW levels (except when spawning EARTH ring after boss defeat)
    if (isNewLevel && level.current < 5) {
      console.log('spawnRingAt: Resetting bossGateCleared for level', level.current);
      bossGateCleared.current = false;
    } else if (isNewLevel && level.current === 5) {
      console.log('spawnRingAt: NOT resetting bossGateCleared for level 5 (EARTH ring)');
    }
    ringDisintegrated.current = false; // reset disintegration flag for new ring
    
    // Set original ring text based on current state when ring spawns
    if (boss.current.active) {
      ringOriginalText.current = "DEFEAT BOSS";
    } else if (level.current === 5 && bossGateCleared.current) {
      ringOriginalText.current = "EARTH";
    } else {
      ringOriginalText.current = `LVL ${level.current + 1}`;
    }

    // Boss spawning is now handled only in levelUp() function when reaching level 5
    // This prevents premature boss spawning when rings are created
    console.log(`spawnRingAt: level ${level.current}, isNewLevel ${isNewLevel}`);
    
    // Ensure boss is not active when spawning progression rings
    if (!isNewLevel || level.current < 5) {
      boss.current.active = false;
    }
  };

  const resetSegment = (first = false) => {
    const segLen = rand(LEVEL_MIN, LEVEL_MAX);
    
    // Ring spawning now handled by ship quota system - no automatic spawning in resetSegment

    const viewBottom = scrollY.current + height;
    nextAstY.current = viewBottom + rand(80, 200);
    nextBarY.current = viewBottom + rand(140, 260);
    nextPwrY.current = viewBottom + rand(200, 360);
    nextShipY.current = viewBottom + rand(260, 420);
  };

  const spawnAhead = () => {
    
    const viewBottom = scrollY.current + height;
    const bufferBelow = 1200;

    while (nextAstY.current < viewBottom + bufferBelow) {
      const id = (asteroids.current[asteroids.current.length - 1]?.id ?? -1) + 1;
      const y = nextAstY.current;
      
      // Occasionally spawn asteroid clusters for variety
      if (Math.random() < 0.15) {
        // Asteroid cluster - 2-4 asteroids close together
        const clusterSize = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < clusterSize; i++) {
          const clusterAst = seedAsteroid(id + i, y + rand(-30, 30));
          // Vary positions slightly
          clusterAst.x = clamp(clusterAst.x + rand(-50, 50), clusterAst.r + 10, width - clusterAst.r - 10);
          asteroids.current.push(clusterAst);
        }
        nextAstY.current = y + rand(200, 350);
      } else {
        // Single asteroid
        asteroids.current.push(seedAsteroid(id, y));
        const aSpace = AST_BASE_SPACING * Math.max(0.7, 1 - 0.06 * (level.current - 1));
        nextAstY.current = y + rand(aSpace * 0.85, aSpace * 1.2);
      }
    }

    while (nextBarY.current < viewBottom + bufferBelow) {
      const id = (barriers.current[barriers.current.length - 1]?.id ?? -1) + 1;
      const y = nextBarY.current;
      
      // Occasionally spawn barrier walls for challenge
      if (Math.random() < 0.12) {
        // Barrier wall with gaps
        const wallCount = 2 + Math.floor(Math.random() * 2);
        const gapSize = rand(80, 120);
        let currentX = 20;
        
        for (let i = 0; i < wallCount && currentX < width - 60; i++) {
          const barrier = seedBarrier(id + i, y);
          barrier.x = currentX;
          barrier.w = rand(60, 100);
          currentX += barrier.w + gapSize;
          barriers.current.push(barrier);
        }
        nextBarY.current = y + rand(400, 600);
      } else {
        // Single barrier
        barriers.current.push(seedBarrier(id, y));
        const bSpace = BAR_BASE_SPACING * Math.max(0.75, 1 - 0.05 * (level.current - 1));
        nextBarY.current = y + rand(bSpace * 0.9, bSpace * 1.25);
      }
    }

    while (nextPwrY.current < viewBottom + bufferBelow) {
      const id = (powerups.current[powerups.current.length - 1]?.id ?? -1) + 1;
      const y = nextPwrY.current;
      powerups.current.push(seedPowerUp(id, y));
      nextPwrY.current = y + rand(PWR_BASE_SPACING * 0.9, PWR_BASE_SPACING * 1.4);
    }

    // Pause ship spawns if boss is active
    while (!boss.current.active && nextShipY.current < viewBottom + bufferBelow) {
      const id = (ships.current[ships.current.length - 1]?.id ?? -1) + 1;
      const y = nextShipY.current;
      ships.current.push(seedShip(id, y));
      const sSpace = SHIP_BASE_SPACING * Math.max(0.8, 1 - 0.04 * (level.current - 1));
      nextShipY.current = y + rand(sSpace * 0.85, sSpace * 1.25);
    }
  };

  /* ----- Reset world ----- */
  const respawnPlayer = () => {
    // Reset pod position to safe area - top of screen below HUD
    podY.current = Math.round(height * 0.5); // Mid-screen, balanced position
    invulnTime.current = 2.5; // Generous invulnerability
    hudFadeT.current = 4.0; // Extended HUD visibility
    canSkipCountdown.current = false;
    playRespawnSound(); // Play SFX for pod respawn
    console.log('🎮 TELEGRAM DEBUG - Setting phase to "playing" from respawnPlayer');
    setPhase("playing");
  };
  
  const skipRespawnCountdown = () => {
    if (!canSkipCountdown.current) return;
    
    // Clear any running countdown
    if ((window as any).currentRespawnInterval) {
      clearInterval((window as any).currentRespawnInterval);
    }
    respawnCountdown.current = 0;
    respawnPlayer();
  };
  
  const hardResetWorld = () => {
    scrollY.current = 0;
    worldV.current = FREE_FALL;

    level.current = 1;
    console.log(`GAME RESET: Level set to ${level.current}`);
    lives.current = maxLives; // Reset lives for new mission
    livesLostThisSession.current = 0; // Reset session tracking
    respawnCountdown.current = 0;

    // Reset scoring system
    currentScore.current = 0;
    sessionStartTime.current = timeSec;
    
    // Reset ship-based progression
    shipsKilledThisLevel.current = 0;
    shipsRequiredForLevel.current = getShipsRequiredForLevel(1);
    levelRingSpawned.current = false;
    
    // Reset ring respawn system
    ringRespawnPending.current = false;
    quotaJustMet.current = false; // CRITICAL: Reset quota state
    levelUpProcessed.current = false; // Reset level up protection
    
    // Reset ring state - no ring visible at start
    ringSpawnT.current = 0;
    ringCenterY.current = 0;
    ringCenterX.current = 0;
    
    // NO ring at start - rings only spawn after meeting ship kill quotas
    // Level 1: Kill 2 ships → Ring appears for Level 2
    
    // Reset tip system
    tipsShown.current.clear();
    lastDeathCause.current = null;
    deathStats.current = { asteroid: 0, barrier: 0, enemy: 0, boss: 0, ship: 0, earth_ring_missed: 0 };

    // Pod center-ish
    podX.current = width * 0.5;
    podY.current = Math.round(height * 0.5);

    nukesLeft.current = 0; // Skill mastery first - no starting nukes
    rapidLevel.current = 0;
    weapon.current = { kind: "basic", level: 1 };
    lastShotTime.current = -999;

    // shields reset
    shieldLives.current = 0;
    invulnTime.current = 0;

    // Energy cells
    energyCells.current = 0;

    // drones reset
    drones.current = [];

    killsAst.current = 0; killsBar.current = 0; killsShip.current = 0;

    asteroids.current = [];
    barriers.current = [];
    powerups.current = [];
    projs.current = [];
    particles.current = [];
    scorePopups.current = [];
    ships.current = [];
    enemyProjs.current = [];
    boss.current.active = false;

    seedStars();

    const viewBottom = scrollY.current + height;
    nextAstY.current = viewBottom + rand(80, 200);
    nextBarY.current = viewBottom + rand(140, 260);
    nextPwrY.current = viewBottom + rand(200, 360);
    nextShipY.current = viewBottom + rand(260, 420);

    resetSegment(true);
    spawnAhead();

    shakeT.current = 0; shakeMag.current = 0; flashTime.current = 0; crashFlashTime.current = 0;
    sweepActive.current = false; sweepR.current = 0;
    
    // Reset victory beam sequence
    victoryBeamActive.current = false;
    victoryBeamProgress.current = 0;
    podVictoryY.current = 0;
    podVictoryScale.current = 1;
    finalDeathSequence.current = false; // Reset final death sequence flag
    
    // Reset game start messaging
    gameStartMessageTimer.current = 0;
    gameStartMessageText.current = "";
    


    hudFadeT.current = 4.0;

    setTimeSec(0);
  };

  /* ----- Loop (always running) ----- */
  useEffect(() => {
    console.log('🎮 TELEGRAM DEBUG - Starting game loop with dimensions:', width, 'x', height);
    hardResetWorld();
    last.current = null;

    const tick = (t: number) => {
      if (last.current == null) last.current = t;
      const dt = Math.min((t - last.current) / 1000, 0.033);
      last.current = t;

      update(dt);

      // Conservative frame skipping for stability
      tickCounter.current = (tickCounter.current || 0) + 1;
      if (tickCounter.current % 3 === 0 || tickCounter.current === 1) {
        setTick((n) => n + 1);
      }
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  /* ----- Keyboard (web/desktop) ----- */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleKeyDown = (e: any) => {
      const k = String(e.key || "").toLowerCase();
      if (k === "n") tryNuke();
      if (k === "e") activateEnergyCell();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); };
  }, []);

  /* ----- Web Touch & Telegram WebApp Prevention ----- */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    
    // Telegram WebApp specific fixes
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      // Expand the WebApp to full height and keep it expanded
      tg.expand();
      
      // Enable closing confirmation to prevent accidental exits
      tg.enableClosingConfirmation();
      
      // Disable vertical swipes that could trigger minimization
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
      
      // Lock the WebApp in fullscreen mode
      if (tg.lockOrientation) {
        tg.lockOrientation();
      }
      
      // Prevent back button from minimizing
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
      
      // Set theme colors for better integration
      tg.setHeaderColor('#060913');
      tg.setBackgroundColor('#060913');
      
      // Additional prevention methods
      const preventMinimization = () => {
        tg.expand();
        return false;
      };
      
      // Re-expand if somehow minimized
      setInterval(() => {
        if (tg.isExpanded === false) {
          tg.expand();
        }
      }, 1000);
      
      // Prevent viewport changes that could trigger minimize
      tg.onEvent('viewportChanged', preventMinimization);
      tg.onEvent('themeChanged', preventMinimization);
    }
    
    // Create an invisible overlay to completely block text selection
    const overlay = document.createElement('div');
    overlay.id = 'touch-blocker-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: -1 !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      touch-action: manipulation !important;
      -webkit-touch-callout: none !important;
      background: transparent !important;
    `;
    
    // Add the overlay to body
    document.body.appendChild(overlay);
    
    // Also force body and html to be unselectable
    document.body.style.cssText = `
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      -webkit-touch-callout: none !important;
      touch-action: manipulation !important;
    `;
    
    document.documentElement.style.cssText = `
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      -webkit-touch-callout: none !important;
      touch-action: manipulation !important;
    `;
    
    // Add a meta tag to disable selection at browser level
    const metaTag = document.createElement('meta');
    metaTag.name = 'format-detection';
    metaTag.content = 'telephone=no, address=no, email=no';
    document.head.appendChild(metaTag);
    
    // Set document.onselectstart to completely block selection
    document.onselectstart = () => false;
    document.ondragstart = () => false;
    (document as any).oncontextmenu = () => false;
    
    // Prevent iOS magnification and double-tap zoom
    const preventDoubleZoom = (event: TouchEvent) => {
      const now = Date.now();
      const lastTouch = (preventDoubleZoom as any).lastTouch || 0;
      if (now - lastTouch <= 300) {
        event.preventDefault();
      }
      (preventDoubleZoom as any).lastTouch = now;
    };
    
    // Prevent context menu and selection
    const preventContext = (e: Event) => e.preventDefault();
    
    // Prevent pinch zoom gestures
    const preventGesture = (e: Event) => e.preventDefault();
    
    // Prevent text selection and drag events
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };
    
    // Add all touch prevention listeners with capture=true for more aggressive prevention
    document.addEventListener('touchend', preventDoubleZoom, true);
    document.addEventListener('contextmenu', preventContext, true);
    document.addEventListener('gesturestart', preventGesture, true);
    document.addEventListener('gesturechange', preventGesture, true);
    document.addEventListener('gestureend', preventGesture, true);
    document.addEventListener('selectstart', preventSelection, true);
    document.addEventListener('dragstart', preventSelection, true);
    document.addEventListener('mousedown', preventSelection, true);
    document.addEventListener('touchstart', preventSelection, true);
    document.addEventListener('touchmove', preventSelection, true);
    
    // Additional Telegram-specific minimization prevention
    document.addEventListener('scroll', (e) => {
      // Prevent pull-to-refresh and overscroll that could trigger minimize
      if (e.target === document || e.target === document.body || e.target === document.documentElement) {
        e.preventDefault();
      }
    }, true);
    
    // Prevent window blur that could indicate minimization
    window.addEventListener('blur', (e) => {
      e.preventDefault();
      // Try to re-focus immediately
      setTimeout(() => window.focus(), 10);
    });
    
    // Prevent visibility change that could trigger minimize
    document.addEventListener('visibilitychange', (e) => {
      if (document.hidden && (window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.expand();
      }
    });
    
    // Apply CSS styles for touch prevention
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        touch-action: manipulation !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        -webkit-focus-ring-color: transparent !important;
        outline: none !important;
      }
      
      body, html {
        overscroll-behavior: none !important;
        -webkit-overscroll-behavior: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
      
      #root, #root * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* Prevent any text selection highlighting */
      ::selection {
        background: transparent !important;
        color: transparent !important;
      }
      
      ::-moz-selection {
        background: transparent !important;
        color: transparent !important;
      }
      
      /* React Native Web specific classes */
      [class*="css-"] {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      
      /* Additional aggressive selection prevention */
      div, span, p, text, view {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup function
    return () => {
      document.removeEventListener('touchend', preventDoubleZoom, true);
      document.removeEventListener('contextmenu', preventContext, true);
      document.removeEventListener('gesturestart', preventGesture, true);
      document.removeEventListener('gesturechange', preventGesture, true);
      document.removeEventListener('gestureend', preventGesture, true);
      document.removeEventListener('selectstart', preventSelection, true);
      document.removeEventListener('dragstart', preventSelection, true);
      document.removeEventListener('mousedown', preventSelection, true);
      document.removeEventListener('touchstart', preventSelection, true);
      document.removeEventListener('touchmove', preventSelection, true);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
      const overlayElement = document.getElementById('touch-blocker-overlay');
      if (overlayElement && overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
      }
    };
  }, []);

  /* ----- Weapons & Actions ----- */
  const currentCooldown = () => {
    const base = CD[weapon.current.kind];
    const mult = 1 - RAPID_FACTOR * rapidLevel.current;
    const lvlBonus = 1 - 0.06 * (weapon.current.level - 1);
    return base * mult * lvlBonus;
  };

  const timeSecRef = useRef(0);
  useEffect(() => { timeSecRef.current = timeSec; }, [timeSec]);

  const tryShoot = () => {
    // Don't shoot during victory beam-up sequence or final death
    if (victoryBeamActive.current || finalDeathSequence.current) return;
    
    const now = timeSecRef.current;
    if (now - lastShotTime.current < currentCooldown()) return;
    lastShotTime.current = now;
    
    // Play weapon fire sound

    const wz = scrollY.current + podY.current;
    const wX = podX.current;

    switch (weapon.current.kind) {
      case "basic": {
        // Basic pod blaster - single weak shot to encourage pickup hunting
        playWeaponFireSound(); // Play SFX for basic weapon fire
        projs.current.push({ id: nextId(), kind: "bullet", x: wX, y: wz + POD_RADIUS + 4, vx: 0, vy: BULLET_SPEED * 0.9, r: 3, ttl: 1.8 });
        break;
      }
      case "M": {
        // Multi-shot progression: 2→3→4 lanes for crowd control scaling
        const count = weapon.current.level + 1; // 2/3/4 lanes
        const spreadPx = 12;
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * spreadPx;
          projs.current.push({ id: nextId(), kind: "bullet", x: wX + offset, y: wz + POD_RADIUS + 4, vx: 0, vy: BULLET_SPEED, r: 4, ttl: 2.0 });
        }
        playMultiGunSound(); // Play multi-gun sound effect
        break;
      }
      case "S": {
        // Spread shot progression: 3→4→5 pellets for satisfying scaling
        const L = weapon.current.level;
        const angles = L === 1 ? [-0.25, 0, 0.25] :
                       L === 2 ? [-0.35, -0.12, 0.12, 0.35] :
                       [-0.4, -0.2, 0, 0.2, 0.4]; // 3/4/5 pellets
        for (const a of angles) {
          const vx = Math.sin(a) * BULLET_SPEED * 0.65;
          const vy = Math.cos(a) * BULLET_SPEED;
          projs.current.push({ id: nextId(), kind: "bullet", x: wX, y: wz + POD_RADIUS + 4, vx, vy: Math.abs(vy), r: 4, ttl: 1.8 });
        }
        playSpreadGunSound(); // Play spread gun sound effect
        break;
      }
      case "L": {
        // Laser progression: Increasingly powerful and visually impressive
        playLaserGunSound(); // Play SFX for laser weapon fire
        const L = weapon.current.level;
        const pierce = 3 + L * 2; // 5/7/9 pierce - dramatically more
        const laserCount = L; // 1/2/3 parallel lasers
        const radius = 2 + L; // 3/4/5 radius - thicker beams
        const speed = LASER_SPEED + L * 50; // faster at higher levels
        const ttl = 1.0 + L * 0.3; // longer range at higher levels
        
        // Create multiple parallel lasers for higher levels
        if (L === 1) {
          // Level 1: Single powerful laser
          projs.current.push({ id: nextId(), kind: "laser", x: wX, y: wz + POD_RADIUS + 4, vx: 0, vy: speed, r: radius, ttl, pierce });
          spawnMuzzle(wX, wz + POD_RADIUS + 2, "#B1E1FF");
          // Light screen shake for L1
          shakeT.current = 0.1;
          shakeMag.current = 2.0;
        } else if (L === 2) {
          // Level 2: Twin parallel lasers
          const spacing = 25;
          for (const offset of [-spacing, spacing]) {
            projs.current.push({ id: nextId(), kind: "laser", x: wX + offset, y: wz + POD_RADIUS + 4, vx: 0, vy: speed, r: radius, ttl, pierce });
            spawnMuzzle(wX + offset, wz + POD_RADIUS + 2, "#A0E0FF");
          }
          // Medium screen shake for L2
          shakeT.current = 0.15;
          shakeMag.current = 4.0;
        } else {
          // Level 3: Triple laser array with center beam
          const spacing = 35;
          for (const offset of [-spacing, 0, spacing]) {
            projs.current.push({ id: nextId(), kind: "laser", x: wX + offset, y: wz + POD_RADIUS + 4, vx: 0, vy: speed, r: radius, ttl, pierce });
            spawnMuzzle(wX + offset, wz + POD_RADIUS + 2, "#80D0FF");
          }
          // Heavy screen shake for L3 - feels like a cannon
          shakeT.current = 0.2;
          shakeMag.current = 6.0;
        }
        break;
      }
      case "F": {
        // Flame progression: 1→2→3 lanes for satisfying area coverage scaling
        const lanes = weapon.current.level === 3 ? [-1, 0, 1] : weapon.current.level === 2 ? [-0.5, 0.5] : [0];
        for (const lane of lanes) {
          projs.current.push({ id: nextId(), kind: "fire", x: wX, y: wz + POD_RADIUS + 4, vx: lane * 50, vy: FIRE_SPEED, r: 4, ttl: 2.2, t: 0 });
        }
        spawnMuzzle(wX, wz + POD_RADIUS + 2, "#FFB46B");
        playFireGunSound(); // Play fire gun sound effect
        break;
      }
      case "H": {
        // Homing progression: 1→2→3 missiles for smart targeting satisfaction
        const count = weapon.current.level; // 1/2/3 missiles
        for (let i = 0; i < count; i++) {
          projs.current.push({ id: nextId(), kind: "homing", x: wX, y: wz + POD_RADIUS + 4, vx: 0, vy: HOMING_SPEED, r: 5, ttl: 3.0, turn: 1100 + 140 * (weapon.current.level - 1) });
        }
        spawnMuzzle(wX, wz + POD_RADIUS + 2, "#FFE486");
        playHomingMissilesGunSound(); // Play homing missiles sound effect
        break;
      }
    }
  };

  const tryNuke = () => {
    if (phaseRef.current !== "playing") return;
    if (nukesLeft.current <= 0) return;
    playUseItemSound(); // Play SFX for nuke usage
    nukesLeft.current -= 1;

    // start sweep from pod
    sweepActive.current = true;
    sweepR.current = 0;
    flashTime.current = NUKE_FLASH_TIME;
  };

  const activateEnergyCell = () => {
    if (phaseRef.current !== "playing") return;
    if (energyCells.current <= 0) return;
    playUseItemSound(); // Play SFX for energy cell usage
    energyCells.current -= 1;

    // +3 shields (stacking) & 3s i-frames
    shieldLives.current = Math.min(MAX_SHIELD_LIVES, shieldLives.current + ENERGY_SHIELD_GAIN);
    invulnTime.current = Math.max(invulnTime.current, ENERGY_IFRAME_TIME);

    // sparkles
    const idBase = (particles.current[particles.current.length - 1]?.id ?? 0) + 1;
    const cx = podX.current, cy = scrollY.current + podY.current;
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = rand(90, 180);
      particles.current.push({
        id: idBase + i,
        x: cx, y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: rand(2.0, 3.2),
        ttl: rand(0.35, 0.65),
        color: i % 3 === 0 ? "#FFE486" : i % 3 === 1 ? "#A7F3D0" : "#B1E1FF",
      });
    }
  };

  /* ---------- ID helper ---------- */
  const nextId = () => (projs.current[projs.current.length - 1]?.id ?? -1) + 1;
  
  /* ---------- Ship-based progression helpers ---------- */
  const getShipsRequiredForLevel = (currentLevel: number): number => {
    // Level 1 -> 2: need 2 ships, Level 2 -> 3: need 3 ships, etc.
    // Level 5 is boss fight only, no ship requirement
    if (currentLevel >= 5) return 0;
    return currentLevel + 1;
  };
  
  const checkShipQuota = () => {
    console.log(`CHECK QUOTA: Level ${level.current}, Killed ${shipsKilledThisLevel.current}/${shipsRequiredForLevel.current}, QuotaJustMet: ${quotaJustMet.current}`);
    
    // Level 5 is boss fight only, no ship progression
    if (level.current >= 5) {
      console.log('QUOTA CHECK BLOCKED: Level >= 5');
      return false;
    }
    
    const required = shipsRequiredForLevel.current;
    const killed = shipsKilledThisLevel.current;
    
    // Check if quota just met for first time
    if (killed >= required && !quotaJustMet.current) {
      console.log('QUOTA CELEBRATION TRIGGERED!');
      quotaJustMet.current = true;
      console.log(`QUOTA MET! Level ${level.current}: ${killed}/${required} ships`);
      
      // DOPAMINE HIT 1: Subtle celebration effect (no distracting flash)
      hudFadeT.current = 4.0;
      // flashTime.current removed - no white screen flash
      shakeT.current = 0.3;
      shakeMag.current = 6; // Gentler shake
      
      // Subtle level notification  
      levelNotificationTimer.current = 2.5; // Show for 2.5 seconds (shorter)
      levelNotificationText.current = `Level ${level.current + 1} available`;
      
      // DOPAMINE HIT 3: Ring starts floating from bottom (0.5s delay)
      setTimeout(() => {
        startRingFloatAnimation();
      }, 500);
      
      return true; // Quota met
    }
    
    return false; // No quota met
  };
  
  const startRingFloatAnimation = () => {
    // Ring spawns at bottom of screen and floats up
    ringFloatStartY.current = scrollY.current + height + 100; // Start below screen
    
    // Set ring to start position and begin animation
    spawnRingAt(ringFloatStartY.current, true);
    ringFloatProgress.current = 0.01; // Start animation (0.01 to trigger updateRingFloatAnimation)
    levelUpProcessed.current = false; // Reset for new ring
    
    console.log('RING FLOAT ANIMATION STARTED');
  };
  
  const updateRingFloatAnimation = (dt: number) => {
    if (ringFloatProgress.current < 1 && ringFloatProgress.current > 0) {
      // Animate ring floating up over 2.5 seconds
      ringFloatProgress.current += dt / 2.5;
      
      if (ringFloatProgress.current >= 1) {
        ringFloatProgress.current = 1;
        console.log('RING FLOAT ANIMATION COMPLETE');
      }
      
      // Update ring position using easing
      const progress = ringFloatProgress.current;
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const targetY = scrollY.current + height * 0.4;
      
      ringCenterY.current = ringFloatStartY.current + (targetY - ringFloatStartY.current) * eased;
    }
  };
  
  const onShipKilled = (ship?: EnemyShip) => {
    // Score the ship kill if ship data available
    if (ship) {
      scoreShipKill(ship);
    } else {
      // Fallback scoring for legacy calls
      killsShip.current += 1;
      const points = calculateEnemyScore('ship', 'fighter', 20, level.current);
      addScore(points, 'ship');
    }

    // Only count ships toward level progression if quota hasn't been met yet
    if (!quotaJustMet.current) {
      shipsKilledThisLevel.current += 1;
    }
    console.log(`SHIP KILLED: ${shipsKilledThisLevel.current}/${shipsRequiredForLevel.current} at level ${level.current} (QuotaMet: ${quotaJustMet.current})`);

    // Check if this kill triggers the celebration sequence
    checkShipQuota();
  };

  /* ---------- FX helpers ---------- */
  const spawnMuzzle = (x: number, y: number, color: string) => {
    const idBase = particles.current[particles.current.length - 1]?.id ?? 0;
    for (let i = 0; i < 5; i++) {
      particles.current.push({
        id: idBase + i + 1,
        x, y,
        vx: rand(-60, 60),
        vy: rand(60, 140),
        r: rand(2, 3.5),
        ttl: 0.2 + Math.random() * 0.15,
        color,
      });
    }
  };

  const boom = (x: number, y: number, power: number, color: string) => {
    // Play explosion sound with volume based on power
    
    const idBase = particles.current[particles.current.length - 1]?.id ?? 0;
    const count = Math.floor(8 + power * 6);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = rand(80, 220) * (0.8 + power * 0.4);
      particles.current.push({
        id: idBase + i + 1,
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd + 40,
        r: rand(2.5, 4.5),
        ttl: 0.45 + Math.random() * 0.35,
        color,
      });
    }
    // smack (short & decaying)
    shakeMag.current = Math.max(shakeMag.current, 6 + power * 7);
    shakeT.current = Math.max(shakeT.current, 0.10 + power * 0.05);
  };

  const spawnScorePopup = (x: number, y: number, score: number) => {
    const id = (scorePopups.current[scorePopups.current.length - 1]?.id ?? 0) + 1;
    const maxTtl = 1.5; // 1.5 seconds duration

    scorePopups.current.push({
      id,
      x: x + rand(-10, 10), // Small random horizontal offset for variety
      y,
      score,
      ttl: maxTtl,
      maxTtl
    });
  };

  const showAcquisitionMessage = (message: string) => {
    acquisitionMessageText.current = message;
    acquisitionMessageTimer.current = 3.0; // Show for 3 seconds
    acquisitionMessageOpacity.current = 1.0; // Start fully visible
    console.log(`🎉 ACQUISITION: ${message}`);
  };

  // DISABLED FOR PERFORMANCE - const createConfetti = () => {
  //   const colors = ["#FFD700", "#FF6B35", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];
  //   const idBase = particles.current[particles.current.length - 1]?.id ?? 0;

  //   // Conservative confetti count for stability
  //   for (let i = 0; i < 15; i++) {
  //     particles.current.push({
  //       id: idBase + i + 1,
  //       x: Math.random() * width,
  //       y: -20,
  //       vx: rand(-30, 30),
  //       vy: rand(100, 200),
  //       r: rand(2, 5),
  //       ttl: rand(3, 5),
  //       color: colors[Math.floor(Math.random() * colors.length)]
  //     });
  //   }
  // };

  // DISABLED FOR PERFORMANCE - const createFirework = (x: number, y: number) => {
  //   const colors = ["#FFD700", "#FF1744", "#00E676", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"];
  //   const idBase = particles.current[particles.current.length - 1]?.id ?? 0;
  //   const particleCount = 12; // Conservative count for stability

  //   for (let i = 0; i < particleCount; i++) {
  //     const angle = (i / particleCount) * Math.PI * 2;
  //     const speed = rand(120, 250);
  //     particles.current.push({
  //       id: idBase + i + 1,
  //       x, y,
  //       vx: Math.cos(angle) * speed,
  //       vy: Math.sin(angle) * speed,
  //       r: rand(2, 4),
  //       ttl: rand(1.5, 2.5),
  //       color: colors[Math.floor(Math.random() * colors.length)]
  //     });
  //   }
  // };

  // DISABLED FOR PERFORMANCE - const startVictoryCelebration = () => {
  //   // Simple celebration for all devices
  //   setTimeout(() => createFirework(width * 0.4, height * 0.4), 500);
  //   setTimeout(() => createFirework(width * 0.6, height * 0.3), 1200);

  //   createConfetti();
  //   setTimeout(() => createConfetti(), 2000);
  // };

  const ringDisintegrate = (centerX: number, centerY: number, radius: number) => {
    const idBase = particles.current[particles.current.length - 1]?.id ?? 0;
    // Conservative particle count for stability
    const particleCount = Math.floor(radius * 0.5);
    
    for (let i = 0; i < particleCount; i++) {
      // Create particles around the ring circumference
      const angle = (i / particleCount) * Math.PI * 2;
      const ringX = centerX + Math.cos(angle) * radius;
      const ringY = centerY + Math.sin(angle) * radius;
      
      // Particles fly outward from ring
      const speed = rand(120, 300);
      const outwardAngle = angle + rand(-0.3, 0.3); // Slight randomness
      
      particles.current.push({
        id: idBase + i + 1,
        x: ringX,
        y: ringY,
        vx: Math.cos(outwardAngle) * speed,
        vy: Math.sin(outwardAngle) * speed,
        r: rand(2.0, 4.0),
        ttl: rand(0.6, 1.2),
        color: boss.current.active ? "#FF8A80" : "#A7F3D0", // Red for boss, green for normal
      });
    }
    
    // Add some extra sparkles at the center
    for (let i = 0; i < 12; i++) {
      const sparkleAngle = Math.random() * Math.PI * 2;
      const sparkleSpeed = rand(80, 200);
      particles.current.push({
        id: idBase + particleCount + i + 1,
        x: centerX,
        y: centerY,
        vx: Math.cos(sparkleAngle) * sparkleSpeed,
        vy: Math.sin(sparkleAngle) * sparkleSpeed,
        r: rand(1.5, 3.0),
        ttl: rand(0.4, 0.8),
        color: boss.current.active ? "#FFE486" : "#CFFFD1",
      });
    }
    
    // Light screen shake for satisfying feedback
    shakeMag.current = Math.max(shakeMag.current, 8);
    shakeT.current = Math.max(shakeT.current, 0.15);
  };

  const levelUp = () => {
    const oldLevel = level.current;
    level.current += 1;
    console.log(`LEVEL UP: ${oldLevel} → ${level.current}`);

    // Award level completion score
    scoreLevelComplete();

    // Play level up sound

    hudFadeT.current = 3.0;

    if (level.current > 5) {
      // Stage 1 clear — handled when you pass EARTH ring after boss
      console.log('GAME COMPLETE - LEVEL > 5');
      return;
    }
    
    // Reset ship progression for new level (only for levels 1-4)
    if (level.current < 5) {
      shipsKilledThisLevel.current = 0;
      shipsRequiredForLevel.current = getShipsRequiredForLevel(level.current);
      levelRingSpawned.current = false;
      quotaJustMet.current = false;
      console.log(`LEVEL ${level.current}: Need ${shipsRequiredForLevel.current} ships for next level`);
    }
    
    // Mothership Reinforcement System: Drone dispatch for level completion
    if (level.current >= 2 && level.current <= 5) {
      // Deploy 3 drone reinforcements for each level milestone
      drones.current = [];
      for (let i = 0; i < MAX_DRONES; i++) {
        const newDrone: Drone = {
          id: Date.now() + Math.random() + i,
          angle: (i * 2 * Math.PI) / MAX_DRONES, // evenly spaced (0°, 120°, 240°)
          orbitRadius: DRONE_ORBIT_RADIUS,
          active: true,
          mode: "orbit",
          x: podX.current,
          y: podY.current,
          vx: 0,
          vy: 0,
          health: 1,
        };
        drones.current.push(newDrone);
      }
      
      // Visual feedback for reinforcement arrival
      hudFadeT.current = 5.0; // Extended HUD visibility for reinforcement message
      console.log(`🤖 MOTHERSHIP DISPATCH: Drone reinforcements deployed to Level ${level.current}!`);
    }
    
    // Level 5: Boss spawns immediately (no ship requirement)
    if (level.current === 5) {
      console.log('LEVEL 5: Boss fight begins');
      
      // Initialize boss properties
      boss.current.active = true;
      boss.current.hp = 30; // Boss HP - balanced for level 5 difficulty
      boss.current.hpMax = 30;
      
      // Spawn boss at bottom of screen, centered horizontally
      boss.current.x = width / 2;
      boss.current.y = scrollY.current + height - 100; // Start near bottom of screen
      
      // Set boss movement velocities (Pong-style bounce pattern)
      boss.current.vx = 85;
      boss.current.vy = 70;
      boss.current.fireT = 1.0; // Reset fire timer
      boss.current.pattern = 0; // Reset attack pattern
      
      console.log(`Boss spawned at (${boss.current.x}, ${boss.current.y}) with ${boss.current.hp} HP`);
    }
    
    // Note: Ring spawning for levels 1-4 is handled by checkLevelProgression() when quota is met
  };

  const sacrificeDrone = (x: number, y: number) => {
    if (drones.current.length > 0) {
      // Remove one drone (first one)
      const sacrificedDrone = drones.current.shift()!;
      boom(sacrificedDrone.x, sacrificedDrone.y, 0.8, "#FFD700");
      invulnTime.current = HIT_INVULN_TIME;
      return true; // Drone took the hit
    }
    return false; // No drones left
  };

  const killPlayer = (cause: 'asteroid' | 'barrier' | 'enemy' | 'boss' | 'ship' | 'earth_ring_missed' = 'enemy') => {
    // Prevent multiple deaths during final death sequence
    if (finalDeathSequence.current) return;

    // Track death cause for contextual tips
    lastDeathCause.current = cause;
    deathStats.current[cause] += 1;

    // Play pod explosion sound
    playHumanShipExplodeSound();
    
    // Generate tip once for this death
    currentDeathTip.current = getContextualTip();
    
    // clear nearby enemy shots
    enemyProjs.current = enemyProjs.current.filter((ep) => {
      const dx = ep.x - podX.current;
      const dy = ep.y - (scrollY.current + podY.current);
      return (dx * dx + dy * dy) > 140 * 140;
    });

    // megaman pop
    const cx = podX.current;
    const cy = scrollY.current + podY.current;
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = rand(130, 260);
      particles.current.push({
        id: (particles.current[particles.current.length - 1]?.id ?? 0) + 1 + i,
        x: cx, y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: rand(2.2, 3.5),
        ttl: rand(0.5, 0.9),
        color: i % 3 === 0 ? "#39D3FF" : i % 3 === 1 ? "#A7F3D0" : "#FFE486",
      });
    }
    // Dramatic crash effects
    shakeMag.current = Math.max(shakeMag.current, 20); // Increased from 14 to 20 for more impact
    shakeT.current = Math.max(shakeT.current, 0.35);   // Increased from 0.22 to 0.35 for longer shake
    crashFlashTime.current = 0.3; // Red flash effect for crash (longer than nuke flash)

    // Lives system logic
    lives.current = Math.max(0, lives.current - 1);
    crashMessage.current = getCrashMessage();
    
    if (lives.current > 0) {
      // Still have lives - enhanced respawn system
      setPhase("respawning");
      livesLostThisSession.current += 1;

      // Emergency nuke system: Give player a nuke if down to last life and has none
      if (lives.current === 1 && nukesLeft.current === 0) {
        nukesLeft.current = 1;
        console.log('🚨 EMERGENCY NUKE: Last life safety net activated!');
      }

      // Smart countdown based on user preferences
      const isFirstLoss = livesLostThisSession.current === 1;
      const baseTime = isFirstLoss ? 4.0 : 3.0;
      const countdownTime = quickRespawn ? 1.5 : baseTime;
      respawnCountdown.current = countdownTime;
      canSkipCountdown.current = true;

      const countdownInterval = setInterval(() => {
        respawnCountdown.current -= 0.1;
        if (respawnCountdown.current <= 0) {
          clearInterval(countdownInterval);
          respawnPlayer();
        }
      }, 100);

      // Store interval ID for skip functionality
      (window as any).currentRespawnInterval = countdownInterval;
    } else {
      // No lives left - true game over with dramatic pause
      finalDeathSequence.current = true; // Hide pod during final death
      projs.current = []; // Clear all player projectiles immediately
      const finalScore = calculateFinalScore(); // Calculate final score with bonuses
      console.log(`💀 GAME OVER! Final score: ${finalScore}, Level: ${level.current}`);
      // Check for leaderboard entry (don't await to avoid blocking)
      checkLeaderboardQualification(finalScore, level.current, false).catch(error => {
        console.error('Failed to check leaderboard qualification:', error);
      });

      // Add 2.5-second delay to let pod explosion sink in
      setTimeout(() => {
        setPhase("dead");
        console.log('🎮 Mission failed screen shown after dramatic pause');
      }, 2500); // 2.5 second delay for emotional impact
    }
  };

  // helper
  const yToScreen = (worldY: number) => worldY - scrollY.current;

  /* ----- Update ----- */
  const update = (dt: number) => {
    setTimeSec((t) => t + dt);

    // Calculate time slow factor for enemies/projectiles
    const isTimeSlowActive = timeSlowRemaining.current > 0;
    const enemyDt = isTimeSlowActive ? dt * TIME_SLOW_FACTOR : dt;

    // Parallax stars + FX timers (smooth wrap on tall screens)
    for (const s of stars.current) {
      s.y += worldV.current * s.parallax * dt;
      if (s.y > height + 4) { s.y = -4; s.x = rand(0, width); }
    }
    if (flashTime.current > 0) flashTime.current = Math.max(0, flashTime.current - dt);
    if (crashFlashTime.current > 0) crashFlashTime.current = Math.max(0, crashFlashTime.current - dt);
    if (shakeT.current > 0) { shakeT.current = Math.max(0, shakeT.current - dt); shakeMag.current *= 0.9; }
    if (invulnTime.current > 0) invulnTime.current = Math.max(0, invulnTime.current - dt);
    if (hudFadeT.current > 0)  hudFadeT.current = Math.max(0, hudFadeT.current - dt);
    if (timeSlowRemaining.current > 0) timeSlowRemaining.current = Math.max(0, timeSlowRemaining.current - dt);
    if (droneDeployCD.current > 0) droneDeployCD.current = Math.max(0, droneDeployCD.current - dt);
    
    // Victory beam-up animation (2-second duration)
    if (victoryBeamActive.current) {
      victoryBeamProgress.current = Math.min(1, victoryBeamProgress.current + dt / 2.0); // 2-second duration
      
      // Pod ascends smoothly off screen
      const ascensionDistance = height * 1.5; // Travel 1.5 screen heights upward
      podVictoryY.current = podY.current - (victoryBeamProgress.current * ascensionDistance);
      
      // Pod shrinks as it gets "pulled up to mothership"
      podVictoryScale.current = 1.0 - (victoryBeamProgress.current * 0.4); // Shrink to 60% size
      
      console.log(`🛸 Beam-up progress: ${(victoryBeamProgress.current * 100).toFixed(1)}%`);
    }
    
    // Simple game start message timer - reuse acquisition message system
    if (gameStartMessageTimer.current > 0) {
      gameStartMessageTimer.current = Math.max(0, gameStartMessageTimer.current - dt);
      
      // Show game start message using acquisition message system
      if (gameStartMessageText.current && acquisitionMessageTimer.current <= 0) {
        acquisitionMessageText.current = gameStartMessageText.current;
        acquisitionMessageTimer.current = gameStartMessageTimer.current;
        acquisitionMessageOpacity.current = 1.0;
        gameStartMessageText.current = ""; // Clear to prevent re-triggering
      }
    }
    

    // Drone system updates
    // First, check if any enemies are too close to the pod and deploy drones
    const podWorldY = scrollY.current + podY.current;
    let threatFound: { x: number; y: number; dist: number } | null = null;
    let minThreatDist = DRONE_ACTIVATION_DISTANCE;
    
    // Find closest threat to pod
    for (const ship of ships.current) {
      const shipScreenY = ship.y - scrollY.current;
      const dx = ship.x - podX.current;
      const dy = shipScreenY - podY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minThreatDist) {
        threatFound = { x: ship.x, y: ship.y, dist }; // store world coordinates
        minThreatDist = dist;
      }
    }
    
    // Deploy closest available drone if threat found (with cooldown to prevent spam)
    if (threatFound && droneDeployCD.current <= 0) {
      let closestDrone: { drone: typeof drones.current[0]; index: number } | null = null;
      let minDroneDist = Infinity;
      
      for (let i = 0; i < drones.current.length; i++) {
        const drone = drones.current[i];
        if (drone.mode === "orbit") {
          const threatScreenY = threatFound.y - scrollY.current; // convert threat to screen
          const dx = drone.x - threatFound.x;
          const dy = drone.y - threatScreenY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDroneDist) {
            closestDrone = { drone, index: i };
            minDroneDist = dist;
          }
        }
      }
      
      // Deploy the closest orbital drone
      if (closestDrone) {
        const drone = closestDrone.drone;
        drone.mode = "kamikaze";
        
        // Keep drone in screen coordinates but target enemies in their screen positions
        // No coordinate conversion needed - drone stays in screen coords
        
        drone.targetX = threatFound.x;
        drone.targetY = threatFound.y - scrollY.current; // convert target to screen coordinates
        const dx = drone.targetX - drone.x;
        const dy = drone.targetY - drone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          drone.vx = (dx / dist) * DRONE_KAMIKAZE_SPEED;
          drone.vy = (dy / dist) * DRONE_KAMIKAZE_SPEED;
        } else {
          drone.vx = 0;
          drone.vy = -DRONE_KAMIKAZE_SPEED; // default upward movement
        }
        droneDeployCD.current = 0.5; // 0.5 second cooldown between deployments
        
        // Add visual feedback - screen shake when drone deploys
        shakeT.current = 0.3;
        shakeMag.current = 8.0;
      }
    }
    
    // Update all drones
    for (let i = drones.current.length - 1; i >= 0; i--) {
      const drone = drones.current[i];

      if (drone.mode === "orbit") {
        // Orbital movement around pod
        drone.angle += DRONE_ORBIT_SPEED * dt;
        drone.x = podX.current + Math.cos(drone.angle) * drone.orbitRadius;
        drone.y = podY.current + Math.sin(drone.angle) * drone.orbitRadius;
      } else if (drone.mode === "kamikaze") {
        // Homing kamikaze movement - track the nearest enemy ship
        let closestTarget: { x: number; y: number } | null = null;
        let closestDist = Infinity;
        
        // Find closest enemy ship to home in on (kamikaze drones use screen coordinates)
        for (const ship of ships.current) {
          const shipScreenY = ship.y - scrollY.current;
          const dx = ship.x - drone.x;
          const dy = shipScreenY - drone.y; // both in screen coordinates
          const dist = dx * dx + dy * dy; // Skip sqrt for performance
          if (dist < closestDist) {
            closestTarget = { x: ship.x, y: shipScreenY };
            closestDist = dist;
          }
        }
        
        if (closestTarget) {
          // Update target and velocity to home in on closest enemy
          drone.targetX = closestTarget.x;
          drone.targetY = closestTarget.y;
          const dx = drone.targetX - drone.x;
          const dy = drone.targetY - drone.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && !isNaN(dist)) {
            drone.vx = (dx / dist) * DRONE_KAMIKAZE_SPEED;
            drone.vy = (dy / dist) * DRONE_KAMIKAZE_SPEED;
          } else {
            drone.vx = 0;
            drone.vy = 0;
          }
        }
        
        // Move drone (with safety checks)
        if (!isNaN(drone.vx) && !isNaN(drone.vy)) {
          drone.x += drone.vx * dt;
          drone.y += drone.vy * dt;
        }

        // Bounce off screen edges - drones stay intact unless destroyed by combat
        if (drone.x < 10) {
          drone.x = 10;
          drone.vx = Math.abs(drone.vx);
        }
        if (drone.x > width - 10) {
          drone.x = width - 10;
          drone.vx = -Math.abs(drone.vx);
        }
        
        // Remove drone if got too far away (drone.y is already in screen coordinates)
        if (drone.y < -200 || drone.y > height + 200) {
          drones.current.splice(i, 1);
          continue;
        }
      }
    }

    // Keep world scrolling in all phases (menu/dead also animate)
    worldV.current = clamp(lerp(worldV.current, FREE_FALL, 1 - Math.exp(-RETURN_TO_FF * dt)), MIN_DESCENT, MAX_DESCENT);
    scrollY.current += worldV.current * dt;

    // Pod movement is now handled by direct touch controls

    spawnAhead();

    // Nuke sweep expand & apply (no lag, spares powerups)
    if (sweepActive.current) {
      sweepR.current += SWEEP_SPEED * dt;
      const cx = podX.current;
      const cy = scrollY.current + podY.current;

      // asteroids
      for (let i = asteroids.current.length - 1; i >= 0; i--) {
        const a = asteroids.current[i];
        const dx = a.x - cx, dy = a.y - cy;
        if (dx*dx + dy*dy <= (sweepR.current + a.r) * (sweepR.current + a.r)) {
          scoreAsteroidKill(a);
          playAsteroidBreakingSound(); // Play SFX for asteroid destruction
          asteroids.current.splice(i, 1);
          boom(a.x, a.y, 0.9 + a.r * 0.02, getAsteroidTypeData(a.type).color);
        }
      }
      // barriers
      for (let i = barriers.current.length - 1; i >= 0; i--) {
        const b = barriers.current[i];
        const bx = clamp(cx, b.x, b.x + b.w);
        const by = clamp(cy, b.y, b.y + b.h);
        const dx = bx - cx, dy = by - cy;
        if (dx*dx + dy*dy <= sweepR.current * sweepR.current) {
          scoreBarrierKill(b);
          playAsteroidBreakingSound(); // Play SFX for barrier destruction
          barriers.current.splice(i, 1);
          boom(bx, by, 1.0, getBarrierTypeData(b.type).color);
        }
      }
      // ships
      for (let i = ships.current.length - 1; i >= 0; i--) {
        const s = ships.current[i];
        const dx = s.x - cx, dy = s.y - cy;
        if (dx*dx + dy*dy <= (sweepR.current + 14) * (sweepR.current + 14)) {
          onShipKilled(s);
          playHumanShipExplodeSound(); // Play SFX for ship explosion
          ships.current.splice(i, 1);
          boom(s.x, s.y, 1.2, "#FFD890");
        }
      }
      // enemy projectiles
      for (let i = enemyProjs.current.length - 1; i >= 0; i--) {
        const e = enemyProjs.current[i];
        const dx = e.x - cx, dy = e.y - cy;
        if (dx*dx + dy*dy <= (sweepR.current + e.r) * (sweepR.current + e.r)) {
          enemyProjs.current.splice(i, 1);
        }
      }
      // boss: heavy chunk (decoupled radius)
      if (boss.current.active) {
        const dx = boss.current.x - cx, dy = boss.current.y - cy;
        const br = BOSS_COLLISION_RADIUS;
        if (dx*dx + dy*dy <= (sweepR.current + br) * (sweepR.current + br)) {
          const chunk = Math.max(1, Math.floor(boss.current.hpMax * 0.25));
          boss.current.hp = Math.max(0, boss.current.hp - chunk);
          boom(boss.current.x, boss.current.y, 1.4, "#B1E1FF");
          if (boss.current.hp <= 0) {
            boss.current.active = false;
            bossGateCleared.current = true;
            console.log('BOSS DEFEATED - bossGateCleared set to TRUE');
            scoreBossKill(); // Award points and show score popup
            boom(boss.current.x, boss.current.y, 1.8, "#FFE486");
            
            // Dramatic EARTH ring entrance effects (no distracting white flash)
            hudFadeT.current = 8.0; // Longer HUD visibility for dramatic effect
            shakeT.current = 1.5; // Longer, more dramatic shake
            shakeMag.current = 25; // Stronger shake for epic boss defeat
            
            // Delay EARTH ring spawn for dramatic pause (longer for nuke to let player reposition)
            setTimeout(() => {
              if (level.current === 5 && bossGateCleared.current) {
                console.log('DRAMATIC EARTH RING ENTRANCE BEGINS (NUKE)');
                startRingFloatAnimation();
              }
            }, 6000); // 6-second dramatic pause for nuke boss defeat
          }
        }
      }

      // end sweep when it fills screen
      const maxR = Math.hypot(width, height);
      if (sweepR.current > maxR + 100) {
        sweepActive.current = false;
        sweepR.current = 0;
      }
    }

    // simulate entities (even when not playing)
    // asteroids drift with horizontal bouncing only (let them flow vertically)
    for (let i = asteroids.current.length - 1; i >= 0; i--) {
      const a = asteroids.current[i];
      a.x += a.vx * enemyDt;
      a.y += a.vy * enemyDt;
      
      // Only bounce off left and right edges (pong-like horizontal bouncing)
      if (a.x < a.r + 5) { 
        a.x = a.r + 5; 
        a.vx = Math.abs(a.vx); // Always bounce away from left edge
      }
      if (a.x > width - a.r - 5) { 
        a.x = width - a.r - 5; 
        a.vx = -Math.abs(a.vx); // Always bounce away from right edge
      }
      
      // Allow natural vertical flow - no top/bottom bouncing
      // Remove if way off screen (either direction)
      const screenY = a.y - scrollY.current;
      if (screenY < -100 || screenY > height + 100) {
        asteroids.current.splice(i, 1);
      }
    }
    for (let i = barriers.current.length - 1; i >= 0; i--) {
      const b = barriers.current[i];
      b.x += b.vx * enemyDt * 0.45;
      b.y += b.vy * enemyDt;
      // reflect before clamp to reduce visible sticking
      if (b.x < 8) { b.vx = Math.abs(b.vx); b.x = 8; }
      if (b.x + b.w > width - 8) { b.vx = -Math.abs(b.vx); b.x = width - 8 - b.w; }
      if (b.y - scrollY.current < -60) barriers.current.splice(i, 1);
    }
    for (let i = powerups.current.length - 1; i >= 0; i--) {
      const p = powerups.current[i];
      p.y += p.vy * dt;
      if (p.y - scrollY.current < -60) powerups.current.splice(i, 1);
    }

    // Enemy ships
    for (let i = ships.current.length - 1; i >= 0; i--) {
      const s = ships.current[i];
      s.x += s.vx * enemyDt * 0.7;
      s.y += s.vy * enemyDt;
      if (s.x < 20) { s.x = 20; s.vx = Math.abs(s.vx); }
      if (s.x > width - 20) { s.x = width - 20; s.vx = -Math.abs(s.vx); }
      if (s.y - scrollY.current < -50) { ships.current.splice(i, 1); continue; }
      // fire
      s.fireCD -= enemyDt;
      if (s.fireCD <= 0 && phaseRef.current === "playing" && !boss.current.active) {
        s.fireCD = s.kind === "scout" ? rand(1.0, 1.6) : rand(0.7, 1.2);
        const targetX = podX.current + rand(-26, 26);
        const targetY = scrollY.current + podY.current + rand(10, 40);
        const dx = targetX - s.x, dy = targetY - s.y;
        const len = Math.hypot(dx, dy) || 1;
        const spd = s.kind === "scout" ? EN_MISSILE_SPEED : EN_PLASMA_SPEED;
        enemyProjs.current.push({
          id: (enemyProjs.current[enemyProjs.current.length - 1]?.id ?? -1) + 1,
          x: s.x, y: s.y,
          vx: (dx / len) * spd,
          vy: (dy / len) * spd,
          r: s.kind === "scout" ? 5 : 6,
          ttl: 3.8,
          kind: s.kind === "scout" ? "missile" : "plasma",
        });
      }
    }

    // Boss: bottom-spawn Pong bounce within a band that stays below the pod
    if (boss.current.active) {
      const b = boss.current;

      // move
      b.x += b.vx * enemyDt;
      b.y += b.vy * enemyDt;

      // horizontal walls
      if (b.x < 40) { b.x = 40; b.vx = Math.abs(b.vx); }
      if (b.x > width - 40) { b.x = width - 40; b.vx = -Math.abs(b.vx); }

      // vertical band relative to screen
      const screenY = yToScreen(b.y);
      const topBound = Math.min(height - 120, Math.max(podY.current + 38, height * 0.58));
      const bottomBound = height - 40;

      if (screenY < topBound) {
        const over = topBound - screenY;
        b.y += over; // push down
        b.vy = Math.abs(b.vy);
      } else if (screenY > bottomBound) {
        const over = screenY - bottomBound;
        b.y -= over; // push up
        b.vy = -Math.abs(b.vy);
      }

      // simple firing pattern toward player
      b.fireT -= dt;
      if (b.fireT <= 0 && phaseRef.current === "playing") {
        const add = (ang: number, spd: number) => {
          enemyProjs.current.push({
            id: (enemyProjs.current[enemyProjs.current.length - 1]?.id ?? -1) + 1,
            x: b.x, y: b.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 6,
            ttl: 3.8,
            kind: "plasma",
          });
        };
        const base = Math.atan2(scrollY.current + podY.current - b.y, podX.current - b.x);
        [-0.2, 0, 0.2].forEach((o) => add(base + o, 520));
        b.fireT = 1.0;
      }
    }

    // Enemy projectiles update
    for (let i = enemyProjs.current.length - 1; i >= 0; i--) {
      const ep = enemyProjs.current[i];
      ep.ttl -= dt;
      ep.x += ep.vx * enemyDt;
      ep.y += ep.vy * enemyDt;
      if (ep.ttl <= 0 || ep.y - scrollY.current > height + 80 || ep.y - scrollY.current < -100) {
        enemyProjs.current.splice(i, 1);
      }
    }

    // Projectiles update (player)
    if (phaseRef.current === "playing") {
      // Auto-fire
      tryShoot();
    }

    for (let i = projs.current.length - 1; i >= 0; i--) {
      const p = projs.current[i];
      const simDt = dt; // keep smooth
      p.ttl -= simDt;
      if (p.kind === "fire") {
        p.t = (p.t ?? 0) + simDt;
        const amp = 16 + weapon.current.level * 8;
        p.x += Math.sin((p.t ?? 0) * 8) * amp * simDt;
      } else if (p.kind === "homing") {
        // prioritize ships >> boss >> others
        let tx = p.x, ty = p.y + 200, best = Infinity;

        for (const s of ships.current) {
          if (s.y <= p.y) continue;
          const sc = (s.y - p.y) + Math.abs(s.x - p.x) * 0.4; // strong bias
          if (sc < best) { best = sc; tx = s.x; ty = s.y; }
        }
        if (boss.current.active && boss.current.y > p.y) {
          const sc = (boss.current.y - p.y) + Math.abs(boss.current.x - p.x) * 0.5;
          if (sc < best) { best = sc; tx = boss.current.x; ty = boss.current.y; }
        }
        for (const a of asteroids.current) {
          if (a.y <= p.y) continue;
          const sc = (a.y - p.y) + Math.abs(a.x - p.x) * 0.9;
          if (sc < best) { best = sc; tx = a.x; ty = a.y; }
        }
        for (const b of barriers.current) {
          if (b.y <= p.y) continue;
          const cx = clamp(p.x, b.x, b.x + b.w);
          const sc = (b.y - p.y) + Math.abs(cx - p.x) * 0.9;
          if (sc < best) { best = sc; tx = cx; ty = b.y; }
        }

        const dx = tx - p.x, dy = ty - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const axp = (dx / len) * (p.turn ?? 900);
        const ayp = (dy / len) * (p.turn ?? 900);
        p.vx += axp * simDt;
        p.vy = Math.abs(p.vy) < HOMING_SPEED ? p.vy + ayp * simDt : p.vy;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > HOMING_SPEED) { p.vx *= HOMING_SPEED / sp; p.vy *= HOMING_SPEED / sp; }
      }
      p.x += p.vx * simDt;
      p.y += Math.abs(p.vy) * simDt;
      if (p.ttl <= 0 || p.y - p.r > scrollY.current + height + 50 || p.x < -60 || p.x > width + 60) {
        projs.current.splice(i, 1);
      }
    }

    // Collisions & ring logic only while playing
    if (phaseRef.current === "playing") {
      // projectile vs asteroids/bars/ships/boss
      for (let i = projs.current.length - 1; i >= 0; i--) {
        const p = projs.current[i];
        let hit = false;

        // asteroids
        for (let j = asteroids.current.length - 1; j >= 0; j--) {
          const a = asteroids.current[j];
          const dx = a.x - p.x, dy = a.y - p.y, rr = a.r + p.r;
          if (dx * dx + dy * dy <= rr * rr) {
            // Calculate damage based on weapon type and level
            let damage = 1;
            if (p.kind === "laser") damage = 2 + weapon.current.level;
            else if (p.kind === "homing") damage = 3 + weapon.current.level; // More damage
            else if (p.kind === "fire") damage = 1 + weapon.current.level;
            else damage = 1 + (weapon.current.level - 1);
            
            a.hp = Math.max(0, a.hp - damage);

            // Homing missile explosive area damage
            if (p.kind === "homing") {
              const explosionRadius = 45 + weapon.current.level * 10;
              const explosionDamage = 1 + weapon.current.level;
              
              // Damage other nearby asteroids
              for (let k = asteroids.current.length - 1; k >= 0; k--) {
                if (k === j) continue; // Skip the directly hit asteroid
                const other = asteroids.current[k];
                const edx = other.x - p.x, edy = other.y - p.y;
                const dist = Math.sqrt(edx * edx + edy * edy);
                if (dist <= explosionRadius) {
                  other.hp = Math.max(0, other.hp - explosionDamage);
                  if (other.hp <= 0) {
                    scoreAsteroidKill(other);
                    playAsteroidBreakingSound(); // Play SFX for asteroid destruction
                    boom(other.x, other.y, 1.0, "#FF6B35");
                    asteroids.current.splice(k, 1);
                    if (k < j) j--; // Adjust index if we removed an earlier element
                  }
                }
              }

              // Damage nearby barriers
              for (let k = barriers.current.length - 1; k >= 0; k--) {
                const barrier = barriers.current[k];
                const bcx = barrier.x + barrier.w * 0.5;
                const bcy = barrier.y + barrier.h * 0.5;
                const edx = bcx - p.x, edy = bcy - p.y;
                const dist = Math.sqrt(edx * edx + edy * edy);
                if (dist <= explosionRadius) {
                  playAsteroidBreakingSound(); // Play SFX for barrier destruction
                  boom(bcx, bcy, 1.2, "#FF4444");
                  barriers.current.splice(k, 1);
                  killsBar.current += 1;
                }
              }

              // Create explosion effect
              boom(p.x, p.y, 1.5, "#FF4444");
              for (let e = 0; e < 8; e++) {
                const angle = (e / 8) * Math.PI * 2;
                const vx = Math.cos(angle) * 100;
                const vy = Math.sin(angle) * 100;
                particles.current.push({
                  id: nextId(), x: p.x, y: p.y, vx, vy, r: 3, 
                  ttl: 0.6, color: "#FF4444"
                });
              }
            }
            a.lastHit = timeSec; // Record hit time for visual feedback
            
            // Create hit effect particles
            const hitColor = p.kind === "laser" ? "#B1E1FF" : p.kind === "fire" ? "#FFB46B" : "#FFE486";
            for (let k = 0; k < 3 + damage; k++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = rand(60, 120);
              particles.current.push({
                id: (particles.current[particles.current.length - 1]?.id ?? 0) + k + 1,
                x: p.x, y: p.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: rand(1.5, 2.5),
                ttl: rand(0.2, 0.4),
                color: hitColor,
              });
            }
            
            if (a.hp <= 0) {
              // Asteroid destroyed
              scoreAsteroidKill(a);
              playAsteroidBreakingSound(); // Play SFX for asteroid destruction
              asteroids.current.splice(j, 1);
              boom(a.x, a.y, 0.8 + a.r * 0.02, getAsteroidTypeData(a.type).color);
            }
            
            if (p.kind === "laser" && (p.pierce ?? 0) > 1) { p.pierce!--; hit = false; } else { hit = true; }
            break;
          }
        }
        if (!hit) {
          // barriers
          for (let j = barriers.current.length - 1; j >= 0; j--) {
            const br = barriers.current[j];
            const cx = clamp(p.x, br.x, br.x + br.w);
            const cy = clamp(p.y, br.y, br.y + br.h);
            const dx = p.x - cx, dy = p.y - cy;
            if (dx * dx + dy * dy <= p.r * p.r) {
              // Calculate damage
              let damage = 1;
              if (p.kind === "laser") damage = 2 + weapon.current.level;
              else if (p.kind === "homing") damage = 2 + (weapon.current.level - 1);
              else if (p.kind === "fire") damage = 1 + weapon.current.level;
              else damage = 1 + (weapon.current.level - 1);
              
              br.hp = Math.max(0, br.hp - damage);
              br.lastHit = timeSec;
              
              // Hit effect particles
              const hitColor = p.kind === "laser" ? "#B1E1FF" : p.kind === "fire" ? "#FFB46B" : "#FFE486";
              for (let k = 0; k < 2 + damage; k++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = rand(50, 100);
                particles.current.push({
                  id: (particles.current[particles.current.length - 1]?.id ?? 0) + k + 1,
                  x: cx, y: cy,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  r: rand(1.5, 2.0),
                  ttl: rand(0.2, 0.3),
                  color: hitColor,
                });
              }
              
              if (br.hp <= 0) {
                scoreBarrierKill(br);
                playAsteroidBreakingSound(); // Play SFX for barrier destruction
                barriers.current.splice(j, 1);
                boom(cx, cy, 1.0, getBarrierTypeData(br.type).color);
              }
              
              if (p.kind === "laser" && (p.pierce ?? 0) > 1) { p.pierce!--; hit = false; } else { hit = true; }
              break;
            }
          }
        }
        // ships
        if (!hit) {
          for (let j = ships.current.length - 1; j >= 0; j--) {
            const s = ships.current[j];
            const dx = p.x - s.x, dy = p.y - s.y;
            const rad = p.r + 12;
            if (dx * dx + dy * dy <= rad * rad) {
              // weapon-scaled damage
              let dmg = 1;
              if (p.kind === "laser") dmg = 3 + 2 * (weapon.current.level - 1);  // very strong
              else if (p.kind === "homing") dmg = 3 + (weapon.current.level - 1);
              else if (p.kind === "fire")   dmg = 2 + (weapon.current.level - 1);
              else                          dmg = 1 + (weapon.current.level - 1);
              s.hp -= dmg;
              boom(p.x, p.y, 0.7, "#FFD890");
              if (s.hp <= 0) {
                onShipKilled(s);
                playHumanShipExplodeSound(); // Play SFX for ship explosion
                ships.current.splice(j, 1);
                boom(s.x, s.y, 1.1, "#FFB46B");
              }
              if (p.kind === "laser" && (p.pierce ?? 0) > 1) { p.pierce!--; hit = false; }
              else hit = true;
              break;
            }
          }
        }
        // boss (decoupled collision radius)
        if (!hit && boss.current.active) {
          const b = boss.current;
          const dx = p.x - b.x, dy = p.y - b.y;
          const rad = BOSS_COLLISION_RADIUS;
          if (dx * dx + dy * dy <= rad * rad) {
            let dmg = 1;
            if (p.kind === "laser") dmg = 4 + 2 * (weapon.current.level - 1);
            else if (p.kind === "homing") dmg = 3 + (weapon.current.level - 1);
            else if (p.kind === "fire")   dmg = 2 + (weapon.current.level - 1);
            else                          dmg = 1 + (weapon.current.level - 1);
            b.hp = Math.max(0, b.hp - dmg);
            boom(p.x, p.y, 0.9, "#B1E1FF");
            if (b.hp <= 0) {
              b.active = false;
              bossGateCleared.current = true;
              console.log('BOSS DEFEATED (projectile) - bossGateCleared set to TRUE');
              scoreBossKill(); // Award points and show score popup
              boom(b.x, b.y, 1.6, "#FFE486");
              
              // Dramatic EARTH ring entrance effects (no distracting white flash)
              hudFadeT.current = 8.0; // Longer HUD visibility for dramatic effect
              shakeT.current = 1.5; // Longer, more dramatic shake
              shakeMag.current = 25; // Stronger shake for epic boss defeat
              
              // Delay EARTH ring spawn for dramatic pause
              setTimeout(() => {
                if (level.current === 5 && bossGateCleared.current) {
                  console.log('DRAMATIC EARTH RING ENTRANCE BEGINS (projectile)');
                  startRingFloatAnimation();
                }
              }, 4000); // 4-second dramatic pause
            }
            if (p.kind === "laser" && (p.pierce ?? 0) > 1) { p.pierce!--; hit = false; } else { hit = true; }
          }
        }

        if (hit) projs.current.splice(i, 1);
      }

      // Player collisions (with lives / i-frames)
      const podWorldY = scrollY.current + podY.current;
      const canBeHit = invulnTime.current <= 0;
      if (canBeHit) {
        // Asteroids
        for (let i = asteroids.current.length - 1; i >= 0; i--) {
          const a = asteroids.current[i];
          const dx = a.x - podX.current, dy = a.y - podWorldY, rr = a.r + POD_RADIUS;
          if (dx * dx + dy * dy <= rr * rr) {
            if (drones.current.length > 0) {
              // Drone sacrifices itself
              sacrificeDrone(a.x, a.y);
              scoreAsteroidKill(a); // Award points and show popup for drone kill
              playAsteroidBreakingSound(); // Play SFX for asteroid destruction
              boom(a.x, a.y, 0.9, "#FFD700");
              asteroids.current.splice(i, 1);
              break;
            } else if (shieldLives.current > 0) {
              shieldLives.current -= 1;
              invulnTime.current = HIT_INVULN_TIME;
              playAsteroidBreakingSound(); // Play SFX for asteroid destruction
              boom(a.x, a.y, 0.9, "#9FFFB7");
              asteroids.current.splice(i, 1);
              break;
            } else {
              killPlayer('asteroid'); return;
            }
          }
        }
        // Bars
        for (let i = barriers.current.length - 1; i >= 0; i--) {
          const br = barriers.current[i];
          const cx = clamp(podX.current, br.x, br.x + br.w);
          const cy = clamp(podWorldY, br.y, br.y + br.h);
          const dx = podX.current - cx, dy = podWorldY - cy;
          if (dx * dx + dy * dy <= POD_RADIUS * POD_RADIUS) {
            if (drones.current.length > 0) {
              // Drone sacrifices itself
              sacrificeDrone(cx, cy);
              scoreBarrierKill(br); // Award points and show popup for drone kill
              playAsteroidBreakingSound(); // Play SFX for barrier destruction
              boom(cx, cy, 0.9, "#FFD700");
              barriers.current.splice(i, 1);
              break;
            } else if (shieldLives.current > 0) {
              shieldLives.current -= 1;
              invulnTime.current = HIT_INVULN_TIME;
              playAsteroidBreakingSound(); // Play SFX for barrier destruction
              boom(cx, cy, 0.9, "#9FFFB7");
              barriers.current.splice(i, 1);
              break;
            } else {
              killPlayer('barrier'); return;
            }
          }
        }
        // Enemy shots
        for (let i = enemyProjs.current.length - 1; i >= 0; i--) {
          const ep = enemyProjs.current[i];
          const dx = ep.x - podX.current, dy = ep.y - podWorldY;
          const rr = ep.r + POD_RADIUS;
          if (dx * dx + dy * dy <= rr * rr) {
            enemyProjs.current.splice(i, 1);
            if (drones.current.length > 0) {
              // Drone sacrifices itself
              sacrificeDrone(ep.x, ep.y);
              boom(ep.x, ep.y, 0.7, "#FFD700");
            } else if (shieldLives.current > 0) {
              shieldLives.current -= 1;
              invulnTime.current = HIT_INVULN_TIME;
              boom(ep.x, ep.y, 0.7, "#9FFFB7");
            } else {
              killPlayer('enemy'); return;
            }
            break;
          }
        }

        // Drone defensive collisions (check drones vs enemy projectiles and ships)
        for (let i = enemyProjs.current.length - 1; i >= 0; i--) {
          const ep = enemyProjs.current[i];
          let hitDrone = false;
          for (let j = drones.current.length - 1; j >= 0; j--) {
            const drone = drones.current[j];
            if (!drone.active) continue;
            const dx = ep.x - drone.x, dy = ep.y - drone.y;
            const rr = ep.r + 8; // drone "hitbox"
            if (dx * dx + dy * dy <= rr * rr) {
              enemyProjs.current.splice(i, 1);
              drones.current.splice(j, 1); // Remove only this specific drone
              boom(drone.x, drone.y, 0.8, "#FFD700");
              hitDrone = true;
              break;
            }
          }
          if (hitDrone) break;
        }

        // Drone kamikaze attacks (check kamikaze drones vs enemy ships)
        for (let i = drones.current.length - 1; i >= 0; i--) {
          const drone = drones.current[i];
          if (drone.mode !== "kamikaze") continue;
          
          for (let j = ships.current.length - 1; j >= 0; j--) {
            const ship = ships.current[j];
            const shipScreenY = ship.y - scrollY.current;
            const dx = drone.x - ship.x, dy = drone.y - shipScreenY; // both screen coordinates
            const rr = 20; // drone hit radius - larger for easier hits
            if (dx * dx + dy * dy <= rr * rr) {
              // Drone kamikaze attack - massive damage to ensure ship destruction
              ship.hp -= 5; // Heavy damage from kamikaze attack
              drones.current.splice(i, 1); // Remove this specific drone immediately
              boom(drone.x, drone.y, 1.4, "#FFD700"); // Large gold explosion for drone impact
              boom(ship.x, shipScreenY, 1.0, "#FF6B35"); // Ship impact explosion
              if (ship.hp <= 0) {
                playHumanShipExplodeSound(); // Play SFX for ship explosion
                ships.current.splice(j, 1);
                onShipKilled(ship); // Pass ship data for proper scoring and popup
                boom(ship.x, ship.y, 1.5, "#FFD890"); // Larger ship destruction explosion
              } else {
                // Even if ship survives, create dramatic explosion effect
                boom(ship.x, shipScreenY, 1.2, "#FF8C00");
              }
              break;
            }
          }
        }

        // Enemy ship body collision
        for (let i = ships.current.length - 1; i >= 0; i--) {
          const s = ships.current[i];
          const dx = s.x - podX.current, dy = s.y - podWorldY;
          const rr = POD_RADIUS + 14;
          if (dx * dx + dy * dy <= rr * rr) {
            if (drones.current.length > 0) {
              // Drone sacrifices itself
              sacrificeDrone(s.x, s.y);
              scoreShipKill(s); // Award points and show popup for drone kill
              playHumanShipExplodeSound(); // Play SFX for ship explosion
              boom(s.x, s.y, 1.0, "#FFD700");
              ships.current.splice(i, 1);
            } else if (shieldLives.current > 0) {
              shieldLives.current -= 1;
              invulnTime.current = HIT_INVULN_TIME;
              playHumanShipExplodeSound(); // Play SFX for ship explosion
              boom(s.x, s.y, 1.0, "#9FFFB7");
              ships.current.splice(i, 1);
            } else {
              killPlayer('ship'); return;
            }
            break;
          }
        }
      }

      // --- Power-up pickups ---
      for (let i = powerups.current.length - 1; i >= 0; i--) {
        const p = powerups.current[i];
        // pod in world coords
        const dx = podX.current - p.x;
        const dy = (scrollY.current + podY.current) - p.y;
        const rr = POD_RADIUS + 16; // a hair more generous for feel
        if (dx * dx + dy * dy <= rr * rr) {
          if (p.kind === "B") {
            // Bubble shield +1 (cap at 6)
            shieldLives.current = Math.min(MAX_SHIELD_LIVES, shieldLives.current + 1);
          } else if (p.kind === "E") {
            // Energy cell: store for later use (max 2)
            energyCells.current = Math.min(2, energyCells.current + 1);
          } else if (p.kind === "R") {
            // Rapid fire level up (cap at 3)
            rapidLevel.current = Math.min(3, rapidLevel.current + 1) as 0 | 1 | 2 | 3;
          } else if (p.kind === "T") {
            // Time slow for 5 seconds
            timeSlowRemaining.current = Math.max(timeSlowRemaining.current, TIME_SLOW_DURATION);
          } else if (p.kind === "N") {
            // Nuke pickup: store for later use (max 3)
            nukesLeft.current = Math.min(3, nukesLeft.current + 1);
          } else if (p.kind === "D") {
            // Spawn 3 drones evenly spaced around the pod (replace any existing)
            drones.current = [];
            for (let i = 0; i < MAX_DRONES; i++) {
              const newDrone: Drone = {
                id: Date.now() + Math.random() + i,
                angle: (i * 2 * Math.PI) / MAX_DRONES, // evenly spaced (0°, 120°, 240°)
                orbitRadius: DRONE_ORBIT_RADIUS,
                active: true,
                mode: "orbit",
                x: podX.current,
                y: podY.current,
                vx: 0,
                vy: 0,
              };
              drones.current.push(newDrone);
            }
          } else {
            // Weapon pickup (S/M/L/F/H): swap or level up (cap at 3)
            const newKind = p.kind as Weapon["kind"];
            playGunCockingSound(); // Play SFX for weapon upgrade pickup
            if (weapon.current.kind === newKind) {
              weapon.current.level = Math.min(3, weapon.current.level + 1) as 1 | 2 | 3;
            } else {
              weapon.current = { kind: newKind, level: 1 };
            }
          }

          // pickup feedback
          playGetItemSound(); // Play SFX for item pickup
          boom(p.x, p.y, 0.6, "#CFFFD1");
          powerups.current.splice(i, 1);
          hudFadeT.current = 2.0; // briefly keep HUD visible
        }
      }

      // --- RING EDGE COLLISION CHECK --- (only when ring is visible)
      if (ringSpawnT.current > 0) {
        const dxRing = podX.current - ringCenterX.current;
        const dyRing = podWorldY - ringCenterY.current;
        const rNow = currentRingRadius();
        const distanceToCenter = Math.sqrt(dxRing*dxRing + dyRing*dyRing);
        
        // Check if pod is touching the ring edge (within pod radius of the ring border)
        const ringEdgeHit = Math.abs(distanceToCenter - rNow) <= POD_RADIUS;
      

      // Boss-gated on level 5
      if (ringEdgeHit) {
        // Trigger ring disintegration effect only once per ring
        if (!ringDisintegrated.current) {
          ringDisintegrate(ringCenterX.current, ringCenterY.current, rNow);
          ringDisintegrated.current = true;
          // Hide the ring immediately after disintegration starts
          ringSpawnT.current = 0;
        }
        
        if (level.current === 5) {
          if (bossGateCleared.current) {
            // EARTH reached → win (with dramatic pause after ring disintegration)
            console.log('VICTORY! EARTH ring touched with bossGateCleared = true');
            console.log('EARTH RING DISINTEGRATION - Victory pause initiated');
            
            // Start dramatic pod beam-up sequence
            victoryBeamActive.current = true;
            victoryBeamProgress.current = 0;
            podVictoryY.current = podY.current; // Save starting position
            podVictoryScale.current = 1;
            console.log('🛸 MOTHERSHIP BEAM-UP SEQUENCE INITIATED');

            // Recall all drones to mothership during beam-up
            drones.current = [];
            console.log('🤖 All drones recalled to mothership for victory sequence');

            // Play space bubbles SFX for mothership beam-up
            playSpaceBubblesSound();
            
            // 2-second delay for dramatic effect after ring disintegrates
            setTimeout(() => {
              console.log('VICTORY SEQUENCE - Showing EARTH REACHED message');
              const finalScore = calculateFinalScore(); // Calculate final score with victory bonus
              console.log(`🎉 VICTORY! Final score: ${finalScore}, Level: ${level.current}`);
              // Check for leaderboard entry (don't await to avoid blocking)
              checkLeaderboardQualification(finalScore, level.current, true).catch(error => {
                console.error('Failed to check leaderboard qualification:', error);
              });
              // startVictoryCelebration(); // 🎉 DISABLED FOR PERFORMANCE 🎉
              setPhase("win");
            }, 2000);
            return;
          } else {
            // Boss not cleared yet - trigger boss fight
            if (!levelUpProcessed.current) {
              levelUpProcessed.current = true;
              playClearLevelSound(); // Play SFX for level ring pop
              levelUp();
            }
            return;
          }
        } else {
          // Prevent multiple levelUp calls per ring collision
          if (!levelUpProcessed.current) {
            levelUpProcessed.current = true;
            
            // Show acquisition message based on current level
            const currentLevel = level.current;
            if (currentLevel === 1) {
              showAcquisitionMessage("MOTHERSHIP REINFORCEMENT • 3 DRONES DEPLOYED");
            } else if (currentLevel === 2) {
              showAcquisitionMessage("TACTICAL UPGRADE • ENHANCED MANEUVERABILITY");
            } else if (currentLevel === 3) {
              showAcquisitionMessage("WEAPONS SYSTEMS • IMPROVED TARGETING");
            } else if (currentLevel === 4) {
              showAcquisitionMessage("FINAL APPROACH • BOSS ENCOUNTER IMMINENT");
            }

            playClearLevelSound(); // Play SFX for level ring pop
            levelUp();
          }
          return;
        }
      }
    } // End of ring visibility check
    }

    // Update ring floating animation
    updateRingFloatAnimation(dt);
    
    // Check for EARTH ring miss = game over (only if player hasn't already won)
    if (phase === "playing" && checkEarthRingFailure()) {
      return; // Exit if EARTH ring was missed
    }
    
    // Check for level ring miss and respawn after 4 seconds
    checkLevelRingMissed();
    
    // Update level notification timer
    if (levelNotificationTimer.current > 0) {
      levelNotificationTimer.current -= dt;
      if (levelNotificationTimer.current <= 0) {
        levelNotificationText.current = '';
      }
    }
    
    // Update acquisition message timer with fade out
    if (acquisitionMessageTimer.current > 0) {
      acquisitionMessageTimer.current -= dt;
      // Fade out during last 0.5 seconds
      if (acquisitionMessageTimer.current <= 0.5) {
        acquisitionMessageOpacity.current = Math.max(0, acquisitionMessageTimer.current / 0.5);
      }
      if (acquisitionMessageTimer.current <= 0) {
        acquisitionMessageText.current = '';
        acquisitionMessageOpacity.current = 0;
      }
    }

    // particles update
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const pa = particles.current[i];
      pa.ttl -= dt;
      pa.x += pa.vx * enemyDt;
      pa.y += pa.vy * enemyDt;
      pa.vx *= 0.98; pa.vy *= 0.98;
      if (pa.ttl <= 0 || pa.y - scrollY.current < -80) particles.current.splice(i, 1);
    }

    // Conservative particle limit for stability
    if (particles.current.length > 100) {
      particles.current.splice(0, particles.current.length - 100);
    }

    // Score popup updates
    for (let i = scorePopups.current.length - 1; i >= 0; i--) {
      const popup = scorePopups.current[i];
      popup.ttl -= dt;
      popup.y -= 60 * dt; // Float upward at 60 pixels per second
      if (popup.ttl <= 0) scorePopups.current.splice(i, 1);
    }

    // Conservative limits for stability
    if (scorePopups.current.length > 15) {
      scorePopups.current.splice(0, scorePopups.current.length - 15);
    }

    if (enemyProjs.current.length > 30) {
      enemyProjs.current.splice(0, enemyProjs.current.length - 30);
    }

    // Ring respawning now handled by ship-based progression system
    // No automatic ring respawning needed
  };

  /* ----- Start / Restart ----- */
  const startGame = () => {
    playButtonPressSound(); // Play button press SFX
    console.log('🚀 GAME START: Simple dispatch message');

    hardResetWorld();

    // Reset gameplay music flag so it starts fresh
    gameplayMusicPlaying.current = false;
    
    // Show simple dispatch message
    gameStartMessageText.current = "🚁 MOTHERSHIP DISPATCH: Pod deployed - Begin descent!";
    gameStartMessageTimer.current = 2.5; // Show for 2.5 seconds
    
    // Position pod in standard starting location
    podY.current = height * 0.5;
    podX.current = width / 2;
    
    console.log('🛸 MOTHERSHIP ARRIVAL: Drop-off sequence initiated');
    console.log('🎮 TELEGRAM DEBUG - Setting phase to "playing" from startGame');

    setPhase("playing"); 
    // Audio handled by phase useEffect
  };
  const goMenu = () => {
    playButtonPressSound(); // Play button press SFX
    setPhase("menu");
    hardResetWorld();
    // Audio handled by phase useEffect
  };
  const toggleHandedness = () => {
    leftHandedMode.current = !leftHandedMode.current;
    console.log(`Handedness toggled to: ${leftHandedMode.current ? 'left' : 'right'}`);
  };
  
  const toggleMusic = async () => {
    const newMusicEnabled = !musicEnabled;
    setMusicEnabled(newMusicEnabled);
    console.log(`Music toggled to: ${newMusicEnabled ? 'on' : 'off'}`);
    
    // Immediately apply volume change
    try {
      if (titleMusic.current) {
        await titleMusic.current.setVolumeAsync(newMusicEnabled ? musicVolume : 0);
      }
    } catch (error) {
      console.log('❌ Failed to toggle music volume:', error);
    }
  };
  

  // Audio system initialization
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Set up audio mode for iOS
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
        
        // Load all music tracks
        await loadTitleMusic();
        await loadGameplayMusic();
        await loadMissionFailedMusic();
        await loadEarthReachedMusic();
        await loadSpaceBubblesSound();
        await loadGetItemSound();
        await loadClearLevelSound();
        await loadButtonPressSound();
        await loadAsteroidBreakingSound();
        await loadGunCockingSound();
        await loadRespawnSound();
        await loadWeaponFireSound();
        await loadUseItemSound();
        await loadLaserGunSound();
        await loadHumanShipExplodeSound();
        await loadMultiGunSound();
        await loadHomingMissilesGunSound();
        await loadFireGunSound();
        await loadSpreadGunSound();
        setAudioLoaded(true);
        console.log('🎵 Audio system fully loaded and ready');
      } catch (error) {
        console.log('❌ Audio initialization error:', error);
      }
    };

    initAudio();
    
    // Cleanup on unmount
    return () => {
      if (titleMusic.current) {
        titleMusic.current.unloadAsync();
      }
      if (gameplayMusic.current) {
        gameplayMusic.current.unloadAsync();
      }
      if (missionFailedMusic.current) {
        missionFailedMusic.current.unloadAsync();
      }
      if (earthReachedMusic.current) {
        earthReachedMusic.current.unloadAsync();
      }
      if (spaceBubblesSound.current) {
        spaceBubblesSound.current.unloadAsync();
      }
      if (getItemSound.current) {
        getItemSound.current.unloadAsync();
      }
      if (clearLevelSound.current) {
        clearLevelSound.current.unloadAsync();
      }
      if (buttonPressSound.current) {
        buttonPressSound.current.unloadAsync();
      }
      if (asteroidBreakingSound.current) {
        asteroidBreakingSound.current.unloadAsync();
      }
      if (gunCockingSound.current) {
        gunCockingSound.current.unloadAsync();
      }
      if (respawnSound.current) {
        respawnSound.current.unloadAsync();
      }
      if (weaponFireSound.current) {
        weaponFireSound.current.unloadAsync();
      }
      if (useItemSound.current) {
        useItemSound.current.unloadAsync();
      }
      if (laserGunSound.current) {
        laserGunSound.current.unloadAsync();
      }
      if (humanShipExplodeSound.current) {
        humanShipExplodeSound.current.unloadAsync();
      }
      if (multiGunSound.current) {
        multiGunSound.current.unloadAsync();
      }
      if (homingMissilesGunSound.current) {
        homingMissilesGunSound.current.unloadAsync();
      }
      if (fireGunSound.current) {
        fireGunSound.current.unloadAsync();
      }
      if (spreadGunSound.current) {
        spreadGunSound.current.unloadAsync();
      }
    };
  }, []);

  // Handle phase changes for audio
  useEffect(() => {
    const handlePhaseAudio = async () => {
      if (!titleMusic.current || !gameplayMusic.current || !missionFailedMusic.current || !audioLoaded) return;

      if (phase === "menu") {
        // Stop all music first
        await stopAllMusic();

        // Play title music if enabled (restart from beginning)
        if (musicEnabled) {
          try {
            await titleMusic.current.setPositionAsync(0); // Restart from beginning
            await titleMusic.current.setVolumeAsync(musicVolume);
            await titleMusic.current.playAsync();
            console.log('🎵 Title music started from beginning');
          } catch (error) {
            console.log('❌ Failed to start title music:', error);
          }
        }
      } else if (phase === "playing") {
        // Stop title and mission failed music only
        try {
          if (titleMusic.current) {
            await titleMusic.current.pauseAsync();
          }
          if (missionFailedMusic.current) {
            await missionFailedMusic.current.pauseAsync();
          }
        } catch (error) {
          console.log('❌ Failed to stop title/mission failed music:', error);
        }

        // Play gameplay music if enabled and not already playing
        if (musicEnabled) {
          try {
            if (!gameplayMusicPlaying.current) {
              // Only restart from beginning if not already playing
              await gameplayMusic.current.setPositionAsync(0); // Restart from beginning
              await gameplayMusic.current.setVolumeAsync(musicVolume);
              await gameplayMusic.current.playAsync();
              gameplayMusicPlaying.current = true;
              console.log('🎵 Gameplay music started from beginning');
            } else {
              // Just ensure proper volume if already playing
              await gameplayMusic.current.setVolumeAsync(musicVolume);
              console.log('🎵 Gameplay music continues playing');
            }
          } catch (error) {
            console.log('❌ Failed to start/continue gameplay music:', error);
          }
        } else {
          // Music disabled - mute if playing
          if (gameplayMusicPlaying.current) {
            try {
              await gameplayMusic.current.setVolumeAsync(0);
            } catch (error) {
              console.log('❌ Failed to mute gameplay music:', error);
            }
          }
        }
      } else if (phase === "respawning") {
        // Keep gameplay music playing during respawn screens
        // Only adjust volume based on music settings
        if (musicEnabled) {
          try {
            if (gameplayMusic.current) {
              await gameplayMusic.current.setVolumeAsync(musicVolume);
            }
            console.log('🎵 Gameplay music continues during respawn');
          } catch (error) {
            console.log('❌ Failed to adjust gameplay music volume:', error);
          }
        } else {
          try {
            if (gameplayMusic.current) {
              await gameplayMusic.current.setVolumeAsync(0);
            }
          } catch (error) {
            console.log('❌ Failed to mute gameplay music:', error);
          }
        }
      } else if (phase === "dead") {
        // Final game over - play mission failed music
        await playMissionFailedMusic();
      } else if (phase === "win") {
        // Play Earth reached music for victory screen
        await playEarthReachedMusic();
        console.log('🎵 Earth reached music playing for victory screen');
      } else {
        // Other phases: keep gameplay music if it was playing
        // This covers any other intermediate states
        console.log('🎵 Audio state maintained for phase:', phase);
      }
    };

    handlePhaseAudio();
  }, [phase, musicEnabled, musicVolume, audioLoaded]);

  // Auto-start music when user interacts with the page (browser autoplay policy)
  useEffect(() => {
    const startMusicOnInteraction = async () => {
      if (audioLoaded && phase === "menu" && musicEnabled && titleMusic.current && !userInteracted.current) {
        try {
          await titleMusic.current.stopAsync(); // Stop first to reset
          await titleMusic.current.setPositionAsync(0);
          await titleMusic.current.setVolumeAsync(musicVolume);
          await titleMusic.current.playAsync();
          userInteracted.current = true; // Mark as started
          console.log('🎵 Started title music after user interaction');
        } catch (error) {
          console.log('❌ Failed to start title music after interaction:', error);
        }
      }
    };

    const handleUserInteraction = () => {
      if (audioLoaded && !userInteracted.current) {
        startMusicOnInteraction();
      }
    };

    // Add global listeners for any user interaction
    if (audioLoaded && !userInteracted.current) {
      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('touchstart', handleUserInteraction, { once: true });
      document.addEventListener('keydown', handleUserInteraction, { once: true });
    }

    // Cleanup
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioLoaded, phase, musicEnabled, musicVolume]);

  /* ----- Render ----- */
  const rNow = currentRingRadius();

  // HUD fade (0..1)
  const hudAlpha = Math.min(1, Math.max(0, hudFadeT.current / 1.0));

  // Blink while invulnerable
  const invulnBlink = invulnTime.current > 0 && Math.floor(timeSec * 16) % 2 === 0;

  // Camera shake
  const shakeX = shakeT.current > 0 ? (Math.random() * 2 - 1) * shakeMag.current : 0;
  const shakeY = shakeT.current > 0 ? (Math.random() * 2 - 1) * shakeMag.current : 0;

  // Ring label (consistent) - show next level since user starts at level 1
  const ringText = ringOriginalText.current || (boss.current.active ? "DEFEAT BOSS" : (level.current === 5 && bossGateCleared.current ? "EARTH" : `LVL ${level.current + 1}`));

  return (
    <View id="game" style={styles.container}>
      {/* Game content with shake effect */}
      <View style={[styles.gameContent, { transform: [{ translateX: shakeX }, { translateY: shakeY }] }]}>
        {/* Stars */}
        {stars.current.map((s) => (
          <View key={s.id} style={[styles.star, { width: s.size, height: s.size, opacity: s.opacity, transform: [{ translateX: s.x }, { translateY: s.y + insets.top }] }]} />
        ))}

      {/* Minimal HUD (auto-fades) - hide during menu - tap to show */}
      {phase !== "menu" && (
        <Pressable 
          style={[styles.hud, { opacity: 0.25 + 0.75 * hudAlpha, top: 10 + insets.top }]} 
          onPress={() => {
            hudFadeT.current = 4.0; // Show HUD for 4 seconds when tapped
          }}
        >
          <Text style={styles.score}>
            🎯 {currentScore.current.toLocaleString()} • LVL {level.current} • ⏱ {Math.floor(timeSec)}s • ❤️ {lives.current}
            {level.current < 5 && shipsRequiredForLevel.current > 0 && (
              <Text style={styles.shipProgress}> • 🚀 {shipsKilledThisLevel.current}/{shipsRequiredForLevel.current}</Text>
            )}
          </Text>
        </Pressable>
      )}
      
      {/* Level Advancement Notification */}
      {levelNotificationTimer.current > 0 && (
        <View style={[styles.levelNotification, { top: height * 0.25 }]} pointerEvents="none">
          <Text style={styles.levelNotificationText}>
            {levelNotificationText.current}
          </Text>
        </View>
      )}
      
      {/* Subtle Acquisition Message */}
      {acquisitionMessageTimer.current > 0 && (
        <View style={[styles.acquisitionMessage, { 
          top: height * 0.75, 
          opacity: acquisitionMessageOpacity.current 
        }]} pointerEvents="none">
          <Text style={styles.acquisitionMessageText}>
            {acquisitionMessageText.current}
          </Text>
        </View>
      )}

      {/* Boss HP bar - hide during menu */}
      {phase !== "menu" && boss.current.active && (
        <View style={[styles.bossBar, { top: 8 + insets.top }]}>
          <View style={[styles.bossBarFill, { width: Math.max(0, (boss.current.hp / Math.max(1, boss.current.hpMax)) * (width - 40)) }]} />
          <Text style={styles.bossBarText}>BOSS</Text>
        </View>
      )}

      {/* RING GOAL + label - only render if ring has been spawned */}
      {ringSpawnT.current > 0 && (
        <View
          style={[
            styles.goalRing,
            {
              width: rNow * 2,
              height: rNow * 2,
              borderRadius: rNow,
              transform: [{ translateX: ringCenterX.current - rNow }, { translateY: yToScreen(ringCenterY.current) - rNow }],
              borderColor: boss.current.active ? "#D66D5A" : "#5AD66F",
            },
          ]}
        />
      )}
      {ringSpawnT.current > 0 && (
        <>
          <View
            style={[
              styles.goalRingInner,
              {
                width: Math.max(0, rNow * 2 - 12),
                height: Math.max(0, rNow * 2 - 12),
                borderRadius: Math.max(0, rNow - 6),
                transform: [{ translateX: ringCenterX.current - Math.max(0, rNow - 6) }, { translateY: yToScreen(ringCenterY.current) - Math.max(0, rNow - 6) }],
                borderColor: boss.current.active ? "rgba(156,46,46,0.6)" : "rgba(46,156,69,0.6)",
                backgroundColor: boss.current.active ? "rgba(156,46,46,0.12)" : "rgba(46,156,69,0.12)",
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.ringLabelBox,
              {
                width: rNow * 2,
                height: rNow * 2,
                borderRadius: rNow,
                transform: [{ translateX: ringCenterX.current - rNow }, { translateY: yToScreen(ringCenterY.current) - rNow }],
              },
            ]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.ringLabel}>
              {ringText}
            </Text>
          </View>
        </>
      )}

      {/* Hexagon Asteroids with red damage progression */}
      {asteroids.current.map((a) => {
        const typeData = getAsteroidTypeData(a.type);
        const healthPercent = a.hp / a.maxHp;
        const timeSinceHit = timeSec - a.lastHit;
        // Disable damage flash to prevent white screen edge flashing
        const recentlyHit = false;
        
        // Get damage-based color (turns red as health decreases)
        const backgroundColor = getAsteroidDamageColor(a);
        let borderColor = typeData.border;
        let opacity = 1;
        
        // Opacity effects for damage states
        if (healthPercent < 0.3) {
          opacity = 0.9;
        } else if (healthPercent < 0.7) {
          opacity = 0.95;
        }
        
        // Rotation based on type and time
        const rotation = (a.id * 17 + timeSec * (a.type === "crystal" ? 30 : 10)) % 360;
        
        return (
          <View 
            key={`A-${a.id}`} 
            style={{
              position: 'absolute',
              width: a.r * 2, 
              height: a.r * 2, 
              transform: [
                { translateX: a.x - a.r }, 
                { translateY: yToScreen(a.y - a.r) },
              ]
            }}
          >
            <HexagonAsteroid
              size={a.r}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              opacity={opacity}
              rotation={rotation}
              damageFlash={recentlyHit}
            />
          </View>
        );
      })}
      
      {/* Barriers with damage states */}
      {barriers.current.map((b) => {
        const typeData = getBarrierTypeData(b.type);
        const healthPercent = b.hp / b.maxHp;
        const timeSinceHit = timeSec - b.lastHit;
        const recentlyHit = timeSinceHit < 0.15;
        
        let backgroundColor = typeData.color;
        let borderColor = typeData.border;
        let opacity = 1;
        
        if (healthPercent < 0.4) {
          backgroundColor = `${backgroundColor}AA`;
          opacity = 0.85;
        } else if (healthPercent < 0.7) {
          opacity = 0.95;
        }
        
        if (recentlyHit) {
          backgroundColor = "#FFFFFF";
          opacity = 0.9;
        }
        
        return (
          <View 
            key={`B-${b.id}`} 
            style={[
              styles.barrier, 
              { 
                width: b.w, 
                height: b.h, 
                backgroundColor,
                borderColor,
                opacity,
                transform: [{ translateX: b.x }, { translateY: yToScreen(b.y) }] 
              }
            ]} 
          >
            {/* Damage indicators */}
            {healthPercent < 0.6 && !recentlyHit && (
              <View style={{
                position: 'absolute',
                top: 2, left: 2, right: 2, bottom: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 4,
              }} />
            )}
          </View>
        );
      })}

      {/* Power-ups */}
      {powerups.current.map((p) => (
        <View key={`P-${p.id}`} style={[styles.power, { transform: [{ translateX: p.x - 14 }, { translateY: yToScreen(p.y - 14) }], backgroundColor: puBg(p.kind), borderColor: puBorder(p.kind) }]}>
          <Text style={styles.powerText}>{p.kind}</Text>
        </View>
      ))}

      {/* Enemy ships */}
      {ships.current.map((s) => (
        <View key={`S-${s.id}`} style={[styles.ship, { transform: [{ translateX: s.x - 12 }, { translateY: yToScreen(s.y - 10) }] }]}>
          <View style={[styles.shipCore, { opacity: s.kind === "fighter" ? 1 : 0.7 }]} />
        </View>
      ))}

      {/* Boss (simple core) */}
      {boss.current.active && (
        <View style={[styles.boss, { transform: [{ translateX: boss.current.x - 28 }, { translateY: yToScreen(boss.current.y - 28) }] }]} />
      )}

      {/* Player Projectiles */}
      {projs.current.map((m) => (
        <View
          key={`PR-${m.id}`}
          style={[
            m.kind === "laser"
              ? [styles.laser, { 
                  width: m.r * 2, 
                  height: 28,
                  opacity: 0.8 + m.r * 0.05, // brighter for thicker lasers
                  shadowColor: "#B1E1FF",
                  shadowOpacity: 0.6,
                  shadowRadius: m.r,
                  transform: [{ translateX: m.x - m.r }, { translateY: yToScreen(m.y - 14) }] 
                }]
              : m.kind === "homing"
              ? [styles.homing, { width: m.r * 2, height: m.r * 2, borderRadius: m.r, transform: [{ translateX: m.x - m.r }, { translateY: yToScreen(m.y - m.r) }] }]
              : [styles.projectile, { width: m.r * 2, height: m.r * 2, borderRadius: m.r, transform: [{ translateX: m.x - m.r }, { translateY: yToScreen(m.y - m.r) }] }],
          ]}
        />
      ))}

      {/* Enemy Projectiles */}
      {enemyProjs.current.map((e) => (
        <View key={`EP-${e.id}`} style={[styles.enemyProj, { width: e.r * 2, height: e.r * 2, borderRadius: e.r, transform: [{ translateX: e.x - e.r }, { translateY: yToScreen(e.y - e.r) }] }]} />
      ))}

      {/* Particles */}
      {particles.current.map((pa) => (
        <View key={`PT-${pa.id}`} style={[styles.particle, { backgroundColor: pa.color, width: pa.r * 2, height: pa.r * 2, borderRadius: pa.r, transform: [{ translateX: pa.x - pa.r }, { translateY: yToScreen(pa.y - pa.r) }] }]} />
      ))}

      {/* Score Popups */}
      {scorePopups.current.map((popup) => {
        const progress = 1 - (popup.ttl / popup.maxTtl);
        const opacity = progress < 0.8 ? 1 : (1 - progress) / 0.2; // Fade out in last 20%
        return (
          <Text
            key={`SP-${popup.id}`}
            style={[
              styles.scorePopup,
              {
                opacity,
                transform: [{ translateX: popup.x - 20 }, { translateY: yToScreen(popup.y) - 10 }]
              }
            ]}
          >
            +{popup.score}
          </Text>
        );
      })}

      {/* Pod (show during gameplay, but not during final death sequence) */}
      {phase === "playing" && podY.current > -500 && !finalDeathSequence.current && (
        <>
          <View
            style={[
              styles.pod,
              invulnBlink ? { opacity: 0.4 } : null,
              { 
                transform: [
                  { translateX: podX.current - POD_RADIUS }, 
                  { translateY: (victoryBeamActive.current ? podVictoryY.current : podY.current) - POD_RADIUS },
                  { scaleX: victoryBeamActive.current ? podVictoryScale.current : 1 },
                  { scaleY: victoryBeamActive.current ? podVictoryScale.current : 1 }
                ] 
              },
            ]}
          />
          {/* Shield rings */}
          {Array.from({ length: shieldLives.current }).map((_, i) => {
            const r = POD_RADIUS + 8 + i * 6;
            return (
              <View
                key={`SR-${i}`}
                style={[
                  styles.shieldRing,
                  invulnBlink ? { opacity: 0.35 } : null,
                  {
                    width: r * 2, height: r * 2, borderRadius: r,
                    transform: [
                      { translateX: podX.current - r }, 
                      { translateY: (victoryBeamActive.current ? podVictoryY.current : podY.current) - r },
                      { scaleX: victoryBeamActive.current ? podVictoryScale.current : 1 },
                      { scaleY: victoryBeamActive.current ? podVictoryScale.current : 1 }
                    ],
                    borderColor: 
                      i === 0 ? "#FF0080" : // Hot Pink
                      i === 1 ? "#8000FF" : // Violet  
                      i === 2 ? "#0080FF" : // Deep Sky Blue
                      i === 3 ? "#00FF80" : // Spring Green
                      i === 4 ? "#FFFF00" : // Yellow
                               "#FF8000",  // Orange
                  },
                ]}
              />
            );
          })}
          
          
          {/* Victory Beam-Up Effect */}
          {victoryBeamActive.current && (
            <View
              style={{
                position: 'absolute',
                left: podX.current - 30,
                top: 0,
                width: 60,
                height: height,
                backgroundColor: `rgba(0, 200, 255, ${0.6 * (1 - victoryBeamProgress.current * 0.5)})`, // Cyan beam that fades
                shadowColor: '#00C8FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 20,
                borderRadius: 30,
              }}
            />
          )}
          
          {/* Victory Beam Particles */}
          {victoryBeamActive.current && (
            <>
              {[...Array(8)].map((_, i) => (
                <View
                  key={`victory-particle-${i}`}
                  style={{
                    position: 'absolute',
                    left: podX.current - 5 + (i % 4 - 2) * 15,
                    top: (victoryBeamActive.current ? podVictoryY.current : podY.current) - 40 - (i * 60),
                    width: 10,
                    height: 10,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 5,
                    opacity: Math.max(0, 1 - victoryBeamProgress.current - (i * 0.1)),
                    shadowColor: '#00C8FF',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                  }}
                />
              ))}
            </>
          )}
          
          
          {/* Drones */}
          {drones.current.map((drone) => {
            // Kamikaze drones spin rapidly, orbital drones use normal angle
            let rotationAngle;
            if (drone.mode === "kamikaze") {
              const spinSpeed = timeSec * 12; // very fast spin for kamikaze pursuit
              rotationAngle = `${(spinSpeed * 180/Math.PI) % 360}deg`;
            } else {
              rotationAngle = isNaN(drone.angle) ? "0deg" : `${(drone.angle * 180/Math.PI)}deg`;
            }
            // All drones now use screen coordinates (with safety checks)
            const renderX = isNaN(drone.x) ? 0 : drone.x - 6;
            const renderY = isNaN(drone.y) ? 0 : drone.y - 4;
            
            return (
              <View
                key={`DR-${drone.id}`}
                style={[
                  styles.drone,
                  {
                    transform: [
                      { translateX: renderX }, 
                      { translateY: renderY },
                      { rotate: rotationAngle }
                    ],
                    backgroundColor: drone.mode === "kamikaze" ? "#FFD700" : "#44FF44", // gold vs green
                  }
                ]}
              />
            );
          })}
        </>
      )}

      {/* Enhanced trackpad-style touch controls - Full screen coverage */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0, 
          top: 0,
          bottom: 0, // Full screen touch control
        }} 
        pointerEvents="auto"
        onStartShouldSetResponder={(e) => {
          if (phase !== "playing") return false;
          return true;
        }}
        onMoveShouldSetResponder={() => false} // Don't steal moves from other components
        onResponderTerminationRequest={() => true} // Always allow termination
        onResponderGrant={(e) => {
          console.log('🎮 TELEGRAM DEBUG - Touch detected, phase:', phase);
          if (phase !== "playing") return;

          const touch = e.nativeEvent;
          // Robust coordinate extraction with validation
          let x = touch.locationX ?? touch.pageX ?? 0;
          let y = touch.locationY ?? touch.pageY ?? 0;

          // Validate coordinates are within screen bounds to prevent edge glitches
          if (x < 0 || x > width || y < 0 || y > height) {
            console.log(`⚠️ Invalid touch coordinates: (${x}, ${y}) - ignoring touch event`);
            return;
          }

          touching.current = true;
          touchStartX.current = x;
          touchStartY.current = y;
          podStartX.current = podX.current;
          podStartY.current = podY.current;
        }}
        onResponderMove={(e) => {
          if (!touching.current || phase !== "playing") return;

          const touch = e.nativeEvent;
          // Robust coordinate extraction with fallback to last known position
          let currentX = touch.locationX ?? touch.pageX;
          let currentY = touch.locationY ?? touch.pageY;

          // If coordinates are invalid or out of bounds, use fallback
          if (currentX == null || currentY == null ||
              currentX < 0 || currentX > width ||
              currentY < 0 || currentY > height) {
            console.log(`⚠️ Invalid move coordinates: (${currentX}, ${currentY}) - using fallback`);
            currentX = touchStartX.current;
            currentY = touchStartY.current;
          }

          const deltaX = currentX - touchStartX.current;
          const deltaY = currentY - touchStartY.current;

          // Additional safety: prevent extremely large jumps that could cause glitches
          const maxDelta = Math.max(width, height) * 0.8; // Max 80% of screen in one frame
          if (Math.abs(deltaX) > maxDelta || Math.abs(deltaY) > maxDelta) {
            console.log(`⚠️ Extreme touch delta detected: (${deltaX}, ${deltaY}) - clamping movement`);
            return; // Skip this movement frame
          }

          const newX = clamp(podStartX.current + deltaX, POD_RADIUS, width - POD_RADIUS);
          const newY = clamp(podStartY.current + deltaY, POD_RADIUS, height - POD_RADIUS);

          podX.current = newX;
          podY.current = newY;
        }}
        onResponderRelease={() => { 
          touching.current = false; 
        }}
        onResponderTerminate={() => { 
          touching.current = false;
        }}
      />


        {/* Flash for nuke (lower zIndex so overlays win) */}
        {flashTime.current > 0 && <View style={[styles.flash, { opacity: flashTime.current / NUKE_FLASH_TIME }]} />}
        
        {/* Red flash for crashes */}
        {crashFlashTime.current > 0 && <View style={[styles.crashFlash, { opacity: crashFlashTime.current / 0.3 }]} />}
      </View>

      {/* BOTTOM INVENTORY BAR - SEPARATE from game view hierarchy for proper multi-touch */}
      {phase === "playing" && (energyCells.current > 0 || nukesLeft.current > 0) && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 20, 
          [leftHandedMode.current ? 'left' : 'right']: 20,
          zIndex: 50,
          backgroundColor: 'rgba(0,0,0,0.6)', 
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 16,
          elevation: 10,
          flexDirection: 'column', // Stack vertically for corner placement
          alignItems: 'center',
          gap: 12,
          minWidth: 80,
        }} pointerEvents="auto">
          {/* Energy Cell Inventory Slot */}
          {energyCells.current > 0 && (
            <Pressable
              onPress={activateEnergyCell}
              style={({ pressed }) => [
                styles.inventorySlot,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
              ]}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={[styles.inventoryItem, styles.energyItem]}>
                <Text style={styles.inventoryLabel}>E</Text>
                <Text style={styles.inventoryCount}>{energyCells.current}</Text>
              </View>
            </Pressable>
          )}
          
          {/* Nuke Inventory Slot */}
          {nukesLeft.current > 0 && (
            <Pressable
              onPress={tryNuke}
              style={({ pressed }) => [
                styles.inventorySlot,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
              ]}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={[styles.inventoryItem, styles.nukeItem]}>
                <Text style={styles.inventoryLabel}>N</Text>
                <Text style={styles.inventoryCount}>{nukesLeft.current}</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* Overlays */}
      {phase !== "playing" && (
        <View style={styles.overlay}>
          {phase !== "menu" && (
            <Text style={styles.overlayTitle}>
              {phase === "win" ? "EARTH REACHED!" : crashMessage.current}
            </Text>
          )}

          {phase === "menu" && <EnhancedMenu
            onStart={startGame}
            leftHandedMode={leftHandedMode.current}
            onToggleHandedness={toggleHandedness}
            musicEnabled={musicEnabled}
            onToggleMusic={toggleMusic}
            onShowLeaderboard={() => setShowLeaderboard(true)}
          />}

          {phase === "win" && (
            <>
              <Text style={styles.overlayText}>Congratulations Pupil! You have made it to Earth — you are one step closer to world domination!</Text>
              <View style={styles.finalScoreContainer}>
                <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
                <Text style={styles.finalScoreValue}>{currentScore.current.toLocaleString()}</Text>
              </View>
              <Pressable onPress={goMenu} style={styles.startBtn}>
                <Text style={styles.startBtnText}>BACK TO MENU</Text>
              </Pressable>
            </>
          )}

          {phase === "respawning" && (() => {
            const respawnMsg = getRespawnMessage();
            const countdown = Math.ceil(respawnCountdown.current);
            const isLastLife = lives.current === 1;
            const showFullMessage = showRespawnTips || isLastLife;
            
            // Simple flicker effect for emergency feel
            const flickerOpacity = Math.sin(Date.now() * 0.01) * 0.1 + 0.9;
            
            return (
              <>
                {/* Emergency title with subtle flicker */}
                <Text style={[
                  showFullMessage ? styles.respawnTitle : styles.respawnTitleCompact,
                  { opacity: flickerOpacity }
                ]}>
                  {showFullMessage ? respawnMsg.title : `⚡ LIFE LOST - ${lives.current} REMAINING ⚡`}
                </Text>
                
                {/* Conditional detailed message */}
                {showFullMessage && (
                  <Text style={styles.overlayText}>{respawnMsg.message}</Text>
                )}
                
                {/* Emergency countdown with tap-to-skip */}
                <Pressable onPress={skipRespawnCountdown} style={[
                  styles.countdownContainer,
                  { opacity: flickerOpacity }
                ]}>
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                  <Text style={styles.countdownLabel}>
                    {quickRespawn ? "Quick respawn" : "Respawning in"}
                  </Text>
                  {canSkipCountdown.current && (
                    <Text style={styles.skipHint}>Tap to skip</Text>
                  )}
                </Pressable>
                
                {/* Tips and preferences */}
                {showFullMessage && (
                  <Text style={styles.respawnTip}>{respawnMsg.tip}</Text>
                )}
                
                {/* Compact handedness toggle */}
                <Pressable 
                  onPress={toggleHandedness}
                  style={styles.respawnHandednessToggle}
                >
                  <Text style={styles.respawnHandednessLabel}>
                    🎮 {leftHandedMode.current ? '👈' : '👉'}
                  </Text>
                  <View style={[
                    styles.respawnToggleSwitch,
                    !leftHandedMode.current && styles.respawnToggleSwitchActive
                  ]}>
                    <View style={[
                      styles.respawnToggleKnob,
                      !leftHandedMode.current && styles.respawnToggleKnobActive
                    ]} />
                  </View>
                </Pressable>
                
                <View style={styles.livesDisplay}>
                  {Array.from({ length: maxLives }).map((_, i) => (
                    <Text key={i} style={[
                      styles.lifeIcon, 
                      i < lives.current ? styles.lifeActive : styles.lifeLost
                    ]}>❤️</Text>
                  ))}
                </View>
                
                {/* User preferences - only show for non-critical situations */}
                {!isLastLife && livesLostThisSession.current >= 2 && (
                  <View style={styles.preferencesContainer}>
                    <Pressable 
                      onPress={() => setShowRespawnTips(!showRespawnTips)}
                      style={styles.checkboxContainer}
                    >
                      <View style={[styles.checkbox, showRespawnTips && styles.checkboxChecked]}>
                        {showRespawnTips && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Show detailed tips</Text>
                    </Pressable>
                    
                    <Pressable 
                      onPress={() => setQuickRespawn(!quickRespawn)}
                      style={styles.checkboxContainer}
                    >
                      <View style={[styles.checkbox, quickRespawn && styles.checkboxChecked]}>
                        {quickRespawn && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Quick respawn (1.5s)</Text>
                    </Pressable>
                  </View>
                )}
              </>
            );
          })()}

          {phase === "dead" && (
            <>
              <View style={styles.missionFailedText}>
                <Text style={styles.overlayText}>Your mission ends here, Pupil.</Text>
                <Text style={styles.overlayText}>Return to base for reassignment.</Text>
                <Text style={styles.overlayText}>The galaxy needs better-trained pilots.</Text>
              </View>
              <View style={styles.finalScoreContainer}>
                <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
                <Text style={styles.finalScoreValue}>{currentScore.current.toLocaleString()}</Text>
              </View>
              <View style={styles.buttonContainer}>
                <Pressable onPress={startGame} style={styles.startBtn}>
                  <Text style={styles.startBtnText}>NEW MISSION</Text>
                </Pressable>
                <Pressable onPress={goMenu} style={[styles.startBtn, styles.secondaryBtn]}>
                  <Text style={[styles.startBtnText, styles.secondaryBtnText]}>RETURN TO MOTHERSHIP</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {/* AAA Name Entry Modal for High Scores */}
      {showNameEntry && (
        <View style={styles.nameEntryOverlay} pointerEvents="box-none">
          <View style={styles.nameEntryModal} pointerEvents="auto">
            <Text style={styles.nameEntryTitle}>🏆 HIGH SCORE! 🏆</Text>
            <Text style={styles.nameEntrySubtitle}>
              Score: {gameResultData?.score.toLocaleString()} • Level: {gameResultData?.level}
            </Text>
            <Text style={styles.nameEntryPrompt}>Enter your pilot name:</Text>

            {telegramUsername && (
              <Text style={styles.telegramUserDetected}>
                🤖 Telegram User Detected: @{telegramUsername}
              </Text>
            )}

            <TextInput
              style={[
                styles.nameEntryInput,
                playerName.trim() && styles.nameEntryInputActive,
                telegramUsername && styles.nameEntryInputTelegram
              ]}
              value={playerName}
              onChangeText={(text) => {
                // Auto-uppercase and limit based on source
                const maxLength = telegramUsername ? 12 : 12;
                const cleanText = text.toUpperCase().slice(0, maxLength);
                setPlayerName(cleanText);
              }}
              placeholder={telegramUsername ? telegramUsername.toUpperCase() : "ACE"}
              placeholderTextColor={telegramUsername ? "#4CAF50" : "#888"}
              maxLength={telegramUsername ? 12 : 12}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              autoFocus={!telegramUsername} // Don't auto-focus if Telegram detected
              selectTextOnFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
              editable={true}
              // React Native Web specific fixes
              {...(Platform.OS === 'web' && {
                // @ts-ignore
                style: {
                  ...StyleSheet.flatten([
                    styles.nameEntryInput,
                    playerName.trim() && styles.nameEntryInputActive,
                    telegramUsername && styles.nameEntryInputTelegram
                  ]),
                  outline: 'none',
                  userSelect: 'text',
                  pointerEvents: 'auto'
                }
              })}
            />

            <View style={styles.nameEntryButtons}>
              <Pressable
                onPress={handleNameSubmit}
                disabled={!playerName.trim()}
                style={[
                  styles.nameEntryButton,
                  styles.nameEntrySubmit,
                  !playerName.trim() && styles.nameEntryButtonDisabled
                ]}
              >
                <Text style={[
                  styles.nameEntryButtonText,
                  !playerName.trim() && styles.nameEntryButtonTextDisabled
                ]}>
                  SUBMIT
                </Text>
              </Pressable>
            </View>

            <Text style={styles.nameEntryHint}>3 characters max • Will be shown in CAPS</Text>
          </View>
        </View>
      )}

      {/* Leaderboard Display Modal */}
      {showLeaderboard && (
        <View style={styles.leaderboardOverlay}>
          <View style={styles.leaderboardModal}>
            <Text style={styles.leaderboardTitle}>🏆 TOP PILOTS 🏆</Text>

            <ScrollView style={styles.leaderboardList}>
              {leaderboardState.entries.map((entry, index) => {
                const rank = index + 1;
                const isPersonalBest = entry.score === leaderboardState.personalBest;

                return (
                  <View key={entry.id} style={[
                    styles.leaderboardEntry,
                    isPersonalBest && styles.leaderboardEntryPersonal
                  ]}>
                    <Text style={styles.leaderboardRank}>
                      {LeaderboardManager.getRankSuffix(rank)}
                    </Text>
                    <Text style={styles.leaderboardName}>{entry.playerName}</Text>
                    <Text style={styles.leaderboardScore}>
                      {LeaderboardManager.formatScore(entry.score)}
                    </Text>
                    <Text style={styles.leaderboardLevel}>Lvl {entry.level}</Text>
                    {entry.victory && <Text style={styles.leaderboardVictory}>🌍</Text>}
                  </View>
                );
              })}

              {leaderboardState.entries.length === 0 && (
                <Text style={styles.leaderboardEmpty}>No scores yet. Be the first!</Text>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowLeaderboard(false)}
              style={styles.leaderboardCloseButton}
            >
              <Text style={styles.leaderboardCloseText}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------- Styling helpers ---------- */
const puBg = (k: PUKind) =>
  k === "S" ? "rgba(24, 32, 64, 0.92)" :     // Deep navy for spread
  k === "M" ? "rgba(32, 48, 64, 0.92)" :     // Steel blue for multi
  k === "L" ? "rgba(48, 24, 64, 0.92)" :     // Deep purple for laser
  k === "F" ? "rgba(64, 32, 24, 0.92)" :     // Deep orange-brown for flame
  k === "H" ? "rgba(64, 48, 24, 0.92)" :     // Deep gold-brown for homing
  k === "R" ? "rgba(24, 48, 32, 0.92)" :     // Deep forest for rapid
  k === "E" ? "rgba(24, 40, 56, 0.92)" :     // Deep teal for energy
  k === "T" ? "rgba(40, 24, 56, 0.92)" :     // Deep violet for time
  k === "D" ? "rgba(32, 48, 32, 0.92)" :     // Deep sage for drones
  k === "N" ? "rgba(64, 24, 24, 0.92)" :     // Deep crimson for nukes
              "rgba(48, 24, 40, 0.92)";      // Deep crimson for others

const puBorder = (k: PUKind) =>
  k === "S" ? "#6B8AE6" :    // Soft blue for spread
  k === "M" ? "#7BA3D9" :    // Soft steel blue for multi  
  k === "L" ? "#B485E6" :    // Soft purple for laser
  k === "F" ? "#E69A6B" :    // Soft orange for flame
  k === "H" ? "#E6C76B" :    // Soft gold for homing
  k === "R" ? "#6BE697" :    // Soft green for rapid
  k === "E" ? "#6BC7E6" :    // Soft cyan for energy
  k === "T" ? "#A56BE6" :    // Soft violet for time
  k === "D" ? "#85E685" :    // Soft lime for drones
  k === "N" ? "#FF6B6B" :    // Bright red for nukes
              "#E66B97";     // Soft pink for others

/* ---------- App Wrapper ---------- */
export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#060913", 
    overflow: "hidden",
    // @ts-ignore - Web-specific CSS properties
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  },
  gameContent: { flex: 1 },

  hud: {
    position: "absolute",
    left: 10,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  score: { 
    color: "#F0F8FF", 
    fontSize: 16, 
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shipProgress: {
    color: "#FFD700",
    fontWeight: "900" as const,
    textShadowColor: "rgba(255, 215, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  star: { position: "absolute", backgroundColor: "#8FB7FF", borderRadius: 2, zIndex: 0 },

  // GOAL RING + label
  goalRing: {
    position: "absolute",
    borderWidth: 6,
    borderColor: "#5AD66F",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  goalRingInner: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(46,156,69,0.6)",
    backgroundColor: "rgba(46,156,69,0.12)",
    zIndex: 1,
  },
  ringLabelBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  ringLabel: {
    color: "#CFFFD1",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  pod: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: "#39D3FF", borderWidth: 2, borderColor: "#0AA3C2", zIndex: 4 },

  // Drones (small rectangles)
  drone: {
    position: "absolute",
    width: 12,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#228822",
    zIndex: 4,
  },

  // Shield rings
  shieldRing: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "transparent",
    zIndex: 3,
  },

  asteroid: { position: "absolute", backgroundColor: "#7E8799", borderWidth: 2, borderColor: "#3E4654", zIndex: 2 },
  barrier:  { position: "absolute", backgroundColor: "#C04E4E", borderWidth: 2, borderColor: "#7A2F2F", borderRadius: 8, zIndex: 2 },

  power: { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", zIndex: 3 },
  powerText: { 
    color: "#F8FAFB", 
    fontWeight: "900", 
    fontSize: 14, 
    lineHeight: 16,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  projectile: { 
    position: "absolute", 
    backgroundColor: "#FFE486", 
    borderWidth: 2, 
    borderColor: "#C9AA55", 
    zIndex: 3,
    shadowColor: "#FFE486",
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  homing: { 
    position: "absolute", 
    backgroundColor: "#FF4444", 
    borderWidth: 2, 
    borderColor: "#AA0000", 
    zIndex: 3,
    shadowColor: "#FF4444",
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 5,
  },
  laser: { 
    position: "absolute", 
    width: 8, 
    height: 28, 
    backgroundColor: "#FFFFFF", 
    borderWidth: 2, 
    borderColor: "#00FFFF", 
    borderRadius: 4, 
    zIndex: 3,
    shadowColor: "#00FFFF",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },

  enemyProj: { position: "absolute", backgroundColor: "#FF7A7A", borderWidth: 1, borderColor: "#7a3d3d", zIndex: 3 },

  particle: { position: "absolute", borderWidth: 0, zIndex: 3 },

  // ENEMIES
  ship: {
    position: "absolute",
    width: 24, height: 20,
    backgroundColor: "#303a56",
    borderColor: "#3B4E78",
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  shipCore: {
    width: 10, height: 6,
    backgroundColor: "#7fb2ff",
    borderRadius: 3,
  },

  boss: {
    position: "absolute",
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#55333a",
    borderColor: "#a65c6e",
    borderWidth: 3,
    zIndex: 3,
  },

  // TOP-RIGHT CONTROLS
  controlsCol: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    gap: 8,
    alignItems: "flex-end",
  },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#2D2D55", borderRadius: 10, borderWidth: 1, borderColor: "#3E3E7A" },
  energyBtn: { backgroundColor: "#244258", borderColor: "#3b6f94" },
  nukeBtn:   { backgroundColor: "#4b2838", borderColor: "#7a3d5a" },
  btnText:   { color: "#E6F3FF", fontSize: 13, fontWeight: "800" },
  
  // BOTTOM INVENTORY BAR
  inventoryBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    zIndex: 20,
  },
  inventorySlot: {
    opacity: 0.95,
  },
  inventoryItem: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  energyItem: {
    backgroundColor: "rgba(16, 32, 48, 0.95)",
    borderColor: "#4A9FE7",
    shadowColor: "#4A9FE7",
  },
  nukeItem: {
    backgroundColor: "rgba(48, 32, 16, 0.95)",
    borderColor: "#E7A74A",
    shadowColor: "#E7A74A",
  },
  inventoryLabel: {
    color: "#E8F4F8",
    fontSize: 16,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  inventoryCount: {
    color: "#B8D4E8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Boss bar
  bossBar: {
    position: "absolute",
    alignSelf: "center",
    left: 20,
    right: 20,
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(160,80,88,0.25)",
    borderWidth: 1,
    borderColor: "rgba(200,100,110,0.5)",
    zIndex: 25,
    overflow: "hidden",
    justifyContent: "center",
  },
  bossBarFill: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    backgroundColor: "#e5747f",
  },
  bossBarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    alignSelf: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // OVERLAYS
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: "rgba(5,10,25,0.85)",
    alignItems: "center",
    justifyContent: "center", // Changed from flex-start to center for vertical centering
    gap: 10,
    paddingHorizontal: 20,
  },
  overlayTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  overlayText:  { color: "#E6F3FF", fontSize: 16, fontWeight: "700", textAlign: "center" },
  overlayHint:  { color: "#BFD4E6", fontSize: 14, marginTop: 8, textAlign: "center" },

  // Tutorial / Legend cards (shared base)
  card: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    width: "92%",
    maxWidth: 560,
    gap: 4,
  },
  cardTitle: { color: "#CFFFD1", fontSize: 14, fontWeight: "900", letterSpacing: 0.6 },
  cardLine: { color: "#E6F3FF", fontSize: 12, lineHeight: 16 },

  // Accordion extras
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    marginBottom: 4,
  },
  accordionChevron: {
    color: "#CFFFD1",
    fontWeight: "900",
    fontSize: 14,
  },

  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.08)",
    fontWeight: "900",
  },
  badge: { fontWeight: "900" },

  // Start button
  startBtn: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#2D2D55",
    borderColor: "#3E3E7A",
    borderWidth: 1,
    borderRadius: 10,
  },
  startBtnText: { color: "#E6F3FF", fontSize: 16, fontWeight: "900", letterSpacing: 1.2 },

  // Handedness toggle styles
  handednessToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45, 45, 85, 0.4)',
    borderColor: 'rgba(62, 62, 122, 0.6)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  handednessLabel: {
    color: '#CFFFD1',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  toggleSwitch: {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(62, 62, 122, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(75, 156, 105, 0.8)',
    borderColor: 'rgba(207, 255, 209, 0.4)',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E6F3FF',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#CFFFD1',
  },

  // Compact respawn screen handedness toggle
  respawnHandednessToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 0, 0, 0.3)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 15,
    marginBottom: 5,
    gap: 8,
  },
  respawnHandednessLabel: {
    color: '#E6F3FF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  respawnToggleSwitch: {
    width: 32,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(62, 62, 122, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  respawnToggleSwitchActive: {
    backgroundColor: 'rgba(75, 156, 105, 0.6)',
    borderColor: 'rgba(207, 255, 209, 0.3)',
  },
  respawnToggleKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E6F3FF',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  respawnToggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#CFFFD1',
  },

  // Lives system UI
  livesRemaining: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center" as const,
    marginTop: 12,
    letterSpacing: 0.8,
  },
  buttonContainer: {
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 8,
  },
  secondaryBtn: {
    backgroundColor: "#1A1A35",
    borderColor: "#2A2A45",
  },
  secondaryBtnText: {
    color: "#B8B8CC",
    fontSize: 14,
  },

  // Enhanced respawn screen styles - Emergency Theme
  respawnTitle: {
    color: "#FF3030",
    fontSize: 22,
    fontWeight: "900" as const,
    textAlign: "center" as const,
    marginBottom: 16,
    letterSpacing: 1.2,
    textShadowColor: "rgba(255, 48, 48, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textTransform: "uppercase" as const,
  },
  countdownContainer: {
    alignItems: "center" as const,
    marginVertical: 20,
    backgroundColor: "rgba(20,0,0,0.8)",
    borderRadius: 15,
    padding: 16,
    borderWidth: 3,
    borderColor: "#FF3030",
    shadowColor: "#FF3030",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownNumber: {
    color: "#FF4444",
    fontSize: 52,
    fontWeight: "900" as const,
    lineHeight: 54,
    textShadowColor: "rgba(255, 68, 68, 0.8)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  countdownLabel: {
    color: "#E6F3FF",
    fontSize: 14,
    fontWeight: "600" as const,
    marginTop: 4,
    opacity: 0.9,
  },
  respawnTip: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    marginTop: 16,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  livesDisplay: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginTop: 20,
    gap: 8,
  },
  lifeIcon: {
    fontSize: 28,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lifeActive: {
    opacity: 1.0,
    transform: [{ scale: 1.1 }],
  },
  lifeLost: {
    opacity: 0.3,
    transform: [{ scale: 0.9 }],
  },
  
  // Mission failed text formatting
  missionFailedText: {
    alignItems: "center" as const,
    marginVertical: 16,
  },
  
  // Compact mode styles - Emergency theme
  respawnTitleCompact: {
    color: "#FF6666",
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 12,
    letterSpacing: 0.8,
    textShadowColor: "rgba(255, 102, 102, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textTransform: "uppercase" as const,
  },
  skipHint: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600" as const,
    marginTop: 6,
    opacity: 0.8,
  },
  
  // Preferences UI
  preferencesContainer: {
    marginTop: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  checkboxContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginVertical: 6,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#4ECDC4",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#4ECDC4",
  },
  checkmark: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900" as const,
    lineHeight: 16,
  },
  checkboxLabel: {
    color: "#E6F3FF",
    fontSize: 14,
    fontWeight: "500" as const,
    flex: 1,
  },

  // NUKE flash (zIndex below overlay so UI always wins)
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF", zIndex: 25 },
  crashFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FF3030", zIndex: 25 }, // Red flash for crashes

  // Enhanced Menu Styles - Professional Game Studio Quality
  menuContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-start', // Allow proper scrolling
    paddingHorizontal: 20,
    paddingTop: 40, // Reduced from 80 for better centering
    paddingBottom: 40, // Match top padding for equal margins
  },
  menuParticles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 20, // Reduced since container now has more top padding
    zIndex: 2,
  },
  logoMain: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 5,
    textAlign: 'center',
  },
  logoImage: {
    width: 330, // 1.5x bigger for better prominence
    height: 105,  // 1.5x bigger for better prominence
    marginBottom: 4,
    alignSelf: 'center',
  },
  logoSub: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00FFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  logoUnderline: {
    width: 120,
    height: 3,
    backgroundColor: '#00FFFF',
    borderRadius: 2,
    marginTop: 3,
  },
  menuScrollView: {
    flex: 1,
    paddingBottom: 20,
    zIndex: 2,
  },
  menuSubtitle: {
    color: "#E6F3FF",
    fontSize: 14, // Reduced from 16 to 14 to prevent wrapping
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20, // Reduced from 22 to 20
    paddingHorizontal: 20,
  },
  menuSections: {
    gap: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  menuCard: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  menuHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    color: "#CFFFD1",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    flex: 1,
  },
  menuChevron: {
    color: "#CFFFD1",
    fontSize: 12,
    fontWeight: "900",
  },
  menuContent: {
    overflow: "hidden",
  },
  menuBullets: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingRight: 24, // Extra padding on right to prevent cutoff
  },
  menuBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingRight: 16, // Increased from 8 to 16 for more breathing room
  },
  menuBulletDot: {
    color: "#FFD79A",
    fontSize: 14,
    marginRight: 10,
    marginTop: 2,
  },
  menuBulletText: {
    color: "#E5E7EB",
    fontSize: 14,
    flex: 1,
    lineHeight: 20, // Reduced from 22 to 20 for better text fitting
    flexWrap: "wrap",
    textAlign: "left", // Ensure left alignment
  },
  menuCTA: {
    marginTop: 20,
    marginHorizontal: 30,
    marginBottom: 15,
    backgroundColor: "#FF3366",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FF6699",
    position: 'relative',
    overflow: 'hidden',
  },
  menuCTAPressed: {
    backgroundColor: "#CC1144",
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.8,
  },
  menuCTAGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: 'rgba(255,51,102,0.3)',
    borderRadius: 27,
    zIndex: -1,
  },
  menuCTAText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  
  // Ship progress indicator
  shipProgress: {
    color: "#FFD700",
    fontWeight: "900" as const,
    textShadowColor: "rgba(255, 215, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Level advancement notification
  levelNotification: {
    position: "absolute" as const,
    alignSelf: "center" as const,
    left: 20,
    right: 20,
    alignItems: "center" as const,
    zIndex: 30,
    pointerEvents: "none" as const,
  },
  
  levelNotificationText: {
    color: "#B8E6C1",
    fontSize: 18,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(184,230,193,0.2)",
  },
  
  acquisitionMessage: {
    position: "absolute" as const,
    left: 20,
    right: 20,
    alignItems: "center" as const,
    zIndex: 25,
    pointerEvents: "none" as const,
  },
  
  acquisitionMessageText: {
    color: "#5AD66F",
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(90,214,111,0.3)",
  },

  finalScoreContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.5)",
    alignItems: "center",
  },

  finalScoreLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD700",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 1.5,
  },

  finalScoreValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(255,215,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  scorePopup: {
    position: "absolute",
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 1000,
  },

  // AAA Leaderboard Name Entry Styles
  nameEntryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  nameEntryModal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 32,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  nameEntryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 12,
    textAlign: "center",
  },
  nameEntrySubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  nameEntryPrompt: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  nameEntryInput: {
    backgroundColor: "#2a2a3e",
    borderWidth: 2,
    borderColor: "#FFD700",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    width: "100%",
    marginBottom: 20,
    minHeight: 56,
    letterSpacing: 4,
    // Prevent layout shift and improve stability
    includeFontPadding: false,
    textAlignVertical: "center",
    // Web-specific input fixes
    ...(Platform.OS === 'web' && {
      outline: 'none',
      userSelect: 'text',
      cursor: 'text',
    }),
  },
  nameEntryInputActive: {
    borderColor: "#00FFFF",
    backgroundColor: "#1f1f33",
    shadowColor: "#00FFFF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nameEntryInputTelegram: {
    borderColor: "#4CAF50", // Green border for Telegram
    backgroundColor: "#0f2a0f", // Dark green background
    shadowColor: "#4CAF50",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  telegramUserDetected: {
    fontSize: 14,
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  nameEntryButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  nameEntryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  nameEntrySubmit: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  nameEntryButtonDisabled: {
    backgroundColor: "#444",
    borderColor: "#666",
  },
  nameEntryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1a1a2e",
  },
  nameEntryButtonTextDisabled: {
    color: "#888",
  },
  nameEntryHint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },

  // AAA Leaderboard Display Styles
  leaderboardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  leaderboardModal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 500,
    height: "70%",
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  leaderboardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 20,
  },
  leaderboardList: {
    flex: 1,
    marginBottom: 20,
  },
  leaderboardEntry: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2a2a3e",
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  leaderboardEntryPersonal: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  leaderboardRank: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    width: 50,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
  },
  leaderboardScore: {
    fontSize: 16,
    color: "#FFFFFF",
    width: 80,
    textAlign: "right",
  },
  leaderboardLevel: {
    fontSize: 14,
    color: "#888",
    width: 50,
    textAlign: "right",
  },
  leaderboardVictory: {
    fontSize: 16,
    marginLeft: 8,
  },
  leaderboardEmpty: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 50,
  },
  leaderboardCloseButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
  },
  leaderboardCloseText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a2e",
  },

  // Menu Leaderboard Button Styles
  leaderboardButton: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderWidth: 2,
    borderColor: "#FFD700",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    shadowColor: "#FFD700",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  leaderboardButtonPressed: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    transform: [{ scale: 0.98 }],
  },
  leaderboardButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "rgba(255, 215, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Social Button Container and Small Buttons
  socialButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderboardButtonSmall: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
  },
  websiteButtonSmall: {
    backgroundColor: "rgba(46, 125, 50, 0.15)",
    borderWidth: 2,
    borderColor: "#2E7D32",
    shadowColor: "#2E7D32",
  },
  xButtonSmall: {
    backgroundColor: "rgba(29, 161, 242, 0.15)",
    borderWidth: 2,
    borderColor: "#1DA1F2",
    shadowColor: "#1DA1F2",
  },
  smallButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },

  // Compact Settings Styles
  compactSettings: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    gap: 20,
  },
  compactSettingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  compactSettingText: {
    fontSize: 18,
    textAlign: "center",
  },
});