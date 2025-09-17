

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
import { useAudioSystem } from './src/systems/AudioSystem';
import { rand, clamp, distance, circleCollision, rectCircleCollision } from './src/utils/math';
import {
  POD_RADIUS, GLOW_RADIUS, FREE_FALL, HORIZONTAL_SPEED, VERTICAL_SPEED,
  HIT_INVULN_TIME, RESPAWN_DELAY, NUKE_RANGE, SWEEP_SPEED,
  PROJECTILE_SPEED, LASER_SPEED, FIRE_SPEED, HOMING_SPEED,
  SHIP_QUOTAS, BOSS_LEVEL, MIN_SCORE_THRESHOLD, COLORS
} from './src/utils/constants';

// Define missing constants temporarily
const MAX_SHIELD_LIVES = 6;
const MAX_DRONES = 3;
const DRONE_ORBIT_RADIUS = 60;
const DRONE_ORBIT_SPEED = 120;

// Import new modular systems
import { WeaponSystem, WeaponType } from './src/systems/WeaponSystem';
import { LevelManager } from './src/systems/LevelManager';
import { EnemySpawner } from './src/systems/EnemySpawner';
import { usePhaseManager, PhaseManager, GamePhase } from './src/systems/PhaseManager';
import { ScoringSystem } from './src/systems/ScoringSystem';
import { EntityManager } from './src/systems/EntityManager';
import { CollisionSystem } from './src/systems/CollisionSystem';

// Import new UI components
import {
  VictoryScreen,
  GameOverScreen,
  RespawnOverlay,
  NameEntryModal,
  MainMenu,
  GameHUD,
  LeaderboardModal,
  ParticleSystem
} from './src/components';

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

/* ---------- Constants now imported from src/utils/constants.ts ---------- */

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
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  onShowLeaderboard: () => void;
};

const EnhancedMenu: React.FC<EnhancedMenuProps> = ({ onStart, leftHandedMode, onToggleHandedness, musicEnabled, onToggleMusic, sfxEnabled, onToggleSfx, onShowLeaderboard }) => {
  const [openId, setOpenId] = useState<string>("");
  const [animPhase, setAnimPhase] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const settingsAnimValue = useRef(new Animated.Value(0)).current;
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

  const toggleSettings = () => {
    if (showSettings) {
      // Hide animation
      Animated.timing(settingsAnimValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start(() => setShowSettings(false));
    } else {
      // Show animation
      setShowSettings(true);
      Animated.timing(settingsAnimValue, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
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

      {/* Settings Gear Icon */}
      <Pressable
        onPress={toggleSettings}
        style={[styles.settingsGear, { opacity: subtleFade }]}
      >
        <Text style={styles.settingsGearText}>⚙️</Text>
      </Pressable>

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
      </View>

      {/* Fixed Subtitle */}
      <Text style={styles.menuSubtitle}>
        • INFILTRATE EARTH'S ATMOSPHERE •{'\n'}• ESTABLISH DOMINANCE •
      </Text>

      <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.menuCTAText}>DESCEND TO EARTH!</Text>
        </Pressable>
      </ScrollView>

      {/* Animated Settings Popup */}
      {showSettings && (
        <Animated.View style={[
          styles.settingsPopup,
          {
            opacity: settingsAnimValue,
            transform: [{
              scale: settingsAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            }]
          }
        ]}>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>SETTINGS</Text>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>CONTROLS</Text>
              <Pressable
                onPress={onToggleHandedness}
                style={styles.settingItem}
              >
                <Text style={styles.settingText}>
                  {leftHandedMode ? '👈 Left-Handed Mode' : '👉 Right-Handed Mode'}
                </Text>
                <View style={[
                  styles.settingToggle,
                  !leftHandedMode && styles.settingToggleActive
                ]}>
                  <View style={[
                    styles.settingToggleKnob,
                    !leftHandedMode && styles.settingToggleKnobActive
                  ]} />
                </View>
              </Pressable>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>AUDIO</Text>
              <Pressable
                onPress={onToggleMusic}
                style={styles.settingItem}
              >
                <Text style={styles.settingText}>
                  {musicEnabled ? '🎵 Music' : '🔇 Music'}
                </Text>
                <View style={[
                  styles.settingToggle,
                  musicEnabled && styles.settingToggleActive
                ]}>
                  <View style={[
                    styles.settingToggleKnob,
                    musicEnabled && styles.settingToggleKnobActive
                  ]} />
                </View>
              </Pressable>

              <Pressable
                onPress={onToggleSfx}
                style={styles.settingItem}
              >
                <Text style={styles.settingText}>
                  {sfxEnabled ? '🔊 Sound Effects' : '🔇 Sound Effects'}
                </Text>
                <View style={[
                  styles.settingToggle,
                  sfxEnabled && styles.settingToggleActive
                ]}>
                  <View style={[
                    styles.settingToggleKnob,
                    sfxEnabled && styles.settingToggleKnobActive
                  ]} />
                </View>
              </Pressable>
            </View>

            <Pressable
              onPress={toggleSettings}
              style={styles.settingsCloseButton}
            >
              <Text style={styles.settingsCloseText}>CLOSE</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

function Game() {
  // PWA and Telegram WebApp integration
  useFullScreenPWA();

  const { width, height } = useWindowDimensions();
  const rawInsets = useSafeAreaInsets();
  const insets = {
    top: rawInsets?.top || 0,
    bottom: rawInsets?.bottom || 0,
    left: rawInsets?.left || 0,
    right: rawInsets?.right || 0,
  };

  // Initialize modular systems
  const audio = useAudioSystem();
  const weaponSystem = useRef(new WeaponSystem()).current;
  const levelManager = useRef(new LevelManager()).current;
  const enemySpawner = useRef(new EnemySpawner()).current;
  const scoringSystem = useRef(new ScoringSystem()).current;
  const entityManager = useRef(new EntityManager()).current;
  const collisionSystem = useRef(new CollisionSystem()).current;

  // Game state
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [leftHandedMode, setLeftHandedMode] = useState(false);

  // Core game refs
  const gameLoopRef = useRef<number>();
  const lastUpdateTime = useRef(Date.now());
  const timeSec = useRef(0);

  // World state
  const scrollY = useRef(0);
  const worldV = useRef(95); // FREE_FALL
  const podX = useRef(width / 2);
  const podY = useRef(height * 0.75);

  // Player state
  const lives = useRef(3);
  const maxLives = 3;
  const currentScore = useRef(0);
  const shieldLives = useRef(0);
  const invulnTime = useRef(0);
  const energyCells = useRef(0);
  const nukesLeft = useRef(0);

  // Touch and input
  const touching = useRef(false);
  const touchX = useRef(0);
  const touchY = useRef(0);

  // Visual effects
  const particles = useRef<any[]>([]);
  const shakeT = useRef(0);
  const shakeMag = useRef(0);
  const flashTime = useRef(0);

  // Stars for background
  const stars = useRef<Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}>>([]);

  // Phase management with callbacks
  const phaseCallbacks = {
    onGameStart: () => {
      hardResetWorld();
      audio.playGameplayMusic();
    },
    onGameOver: () => {
      audio.playMissionFailedMusic();
    },
    onVictory: () => {
      audio.playEarthReachedMusic();
    },
    onRespawn: () => {
      respawnPlayer();
    },
    onPhaseChange: (newPhase: GamePhase, oldPhase: GamePhase) => {
      console.log(`🎮 Phase change: ${oldPhase} → ${newPhase}`);
    },
    playRespawnSound: () => audio.playRespawnSound(),
    playMissionFailedMusic: () => audio.playMissionFailedMusic(),
    playEarthReachedMusic: () => audio.playEarthReachedMusic(),
  };

  const phaseManager = usePhaseManager(phaseCallbacks);

  // Initialize game systems
  useEffect(() => {
    // Initialize background stars
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

    // Initialize spawn positions
    enemySpawner.initializeSpawnPositions({
      width,
      height,
      level: levelManager.getCurrentLevel(),
      scrollY: scrollY.current,
      bufferDistance: 1200,
    });

    // Start game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Core game functions
  const hardResetWorld = () => {
    scrollY.current = 0;
    worldV.current = 95;
    podX.current = width / 2;
    podY.current = height * 0.75;

    lives.current = maxLives;
    currentScore.current = 0;
    shieldLives.current = 0;
    invulnTime.current = 0;
    energyCells.current = 0;
    nukesLeft.current = 0;
    timeSec.current = 0;

    // Reset all systems
    levelManager.reset();
    weaponSystem.reset();
    enemySpawner.reset();
    scoringSystem.reset();
    entityManager.reset();

    particles.current = [];
    shakeT.current = 0;
    shakeMag.current = 0;
    flashTime.current = 0;

    // Initialize spawning
    enemySpawner.initializeSpawnPositions({
      width,
      height,
      level: levelManager.getCurrentLevel(),
      scrollY: scrollY.current,
      bufferDistance: 1200,
    });
  };

  const respawnPlayer = () => {
    podY.current = Math.round(height * 0.5);
    invulnTime.current = 2.5;
  };

  const gameLoop = () => {
    const now = Date.now();
    const deltaTime = Math.min((now - lastUpdateTime.current) / 1000, 1/30); // Cap at 30 FPS
    lastUpdateTime.current = now;

    if (phaseManager.canPlay()) {
      // Update game time
      timeSec.current += deltaTime;

      // Update world scroll
      scrollY.current += worldV.current * deltaTime;

      // Update weapon system
      weaponSystem.update(now / 1000);

      // Update level progression
      levelManager.updateRing(deltaTime, height);

      // Spawn new enemies
      const spawnConfig = {
        width,
        height,
        level: levelManager.getCurrentLevel(),
        scrollY: scrollY.current,
        bufferDistance: 1200,
      };

      const newEntities = enemySpawner.spawnAhead(spawnConfig, false);

      // Add new entities to entity manager
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

      // Update scoring system
      scoringSystem.updateScorePopups(deltaTime);

      // Handle weapon firing
      if (weaponSystem.canFire(now / 1000)) {
        const projectiles = weaponSystem.fire(
          podX.current,
          podY.current - 20,
          now / 1000,
          entityManager
        );
        audio.playWeaponFireSound();
      }

      // Collision detection
      handleCollisions();

      // Update visual effects
      updateVisualEffects(deltaTime);

      // Update stars parallax scrolling
      for (const s of stars.current) {
        s.y += worldV.current * s.parallax * deltaTime;
        if (s.y > height + 4) {
          s.y = -4;
          s.x = Math.random() * width;
        }
      }

      // Check level progression
      checkLevelProgression();
    }

    // Update phase manager
    phaseManager.update(deltaTime, lives.current);

    // Continue game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const handleCollisions = () => {
    // Player vs enemies collision detection
    if (invulnTime.current <= 0) {
      const playerCollisions = collisionSystem.checkPlayerCollisions(
        podX.current,
        podY.current,
        18, // POD_RADIUS
        entityManager.getAllEntities()
      );

      if (playerCollisions.length > 0) {
        onPlayerHit();
      }
    }

    // Projectile vs enemy collisions
    const projectileHits = collisionSystem.checkProjectileCollisions(
      entityManager.getEntities('projectiles'),
      entityManager.getAllEntities()
    );

    projectileHits.forEach(hit => {
      // Award score
      const points = scoringSystem.scoreAsteroidKill(hit.target, levelManager.getCurrentLevel());
      currentScore.current = scoringSystem.getScore();

      // Remove entities
      entityManager.removeEntity(hit.targetCategory, hit.target.id);
      entityManager.removeEntity('projectiles', hit.projectile.id);

      // Create particles
      createExplosionParticles(hit.target.x, hit.target.y);
    });
  };

  const onPlayerHit = () => {
    if (shieldLives.current > 0) {
      shieldLives.current--;
      invulnTime.current = 1.5;
    } else {
      lives.current--;
      invulnTime.current = 1.5;

      if (lives.current <= 0) {
        phaseManager.endGame(false);
      } else {
        phaseManager.startRespawn();
      }
    }

    audio.playHumanShipExplodeSound();
    createExplosionParticles(podX.current, podY.current);
  };

  const checkLevelProgression = () => {
    // Check if ship quota is met
    const shipsKilled = levelManager.getShipsKilled();
    const shipQuota = levelManager.getShipQuota();

    if (shipsKilled >= shipQuota && !levelManager.isLevelComplete()) {
      levelManager.onShipKilled();
      audio.playClearLevelSound();
    }

    // Check ring collision
    const ringCollision = levelManager.checkRingCollision(
      podX.current,
      podY.current,
      18 // POD_RADIUS
    );

    if (ringCollision) {
      if (levelManager.getCurrentLevel() >= 5) {
        phaseManager.endGame(true); // Victory!
      } else {
        // Advance to next level
        // This will be handled by the level manager
      }
    }

    // Check victory condition
    if (levelManager.isGameComplete()) {
      phaseManager.endGame(true);
    }
  };

  const createExplosionParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        r: 2 + Math.random() * 3,
        ttl: 0.5 + Math.random() * 0.5,
        color: '#FF6B35',
      });
    }
  };

  const updateVisualEffects = (deltaTime: number) => {
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

    // Update screen shake
    if (shakeT.current > 0) {
      shakeT.current -= deltaTime;
    }

    // Update flash effects
    if (flashTime.current > 0) {
      flashTime.current -= deltaTime;
    }

    // Update invulnerability
    if (invulnTime.current > 0) {
      invulnTime.current -= deltaTime;
    }
  };

  // Touch handlers
  const handleTouchStart = (event: any) => {
    if (!phaseManager.canPlay()) return;

    touching.current = true;
    const touch = event.nativeEvent.touches[0];
    touchX.current = touch.pageX;
    touchY.current = touch.pageY;
  };

  const handleTouchMove = (event: any) => {
    if (!touching.current || !phaseManager.canPlay()) return;

    const touch = event.nativeEvent.touches[0];
    const deltaX = touch.pageX - touchX.current;
    const deltaY = touch.pageY - touchY.current;

    podX.current = Math.max(20, Math.min(width - 20, podX.current + deltaX));
    podY.current = Math.max(100, Math.min(height - 100, podY.current + deltaY));

    touchX.current = touch.pageX;
    touchY.current = touch.pageY;
  };

  const handleTouchEnd = () => {
    touching.current = false;
  };

  // UI event handlers
  const startGame = () => {
    phaseManager.startGame();
  };

  const goMenu = () => {
    phaseManager.setPhase("menu");
  };

  const toggleHandedness = () => {
    setLeftHandedMode(!leftHandedMode);
  };

  const toggleMusic = () => {
    audio.toggleMusic();
  };

  const toggleSfx = () => {
    audio.toggleSfx();
  };

  // Render
  return (
    <View style={styles.container}>
      <View
        style={styles.gameContent}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* DEBUG: Test element to verify rendering */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 50,
          width: 100,
          height: 100,
          backgroundColor: 'red',
          zIndex: 1000
        }}>
          <Text style={{ color: 'white', fontSize: 16 }}>DEBUG</Text>
        </View>

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
          const rotation = (a.id * 17 + (timeSec.current * 10)) % 360;
          return (
            <View
              key={`A-${a.id}`}
              style={{
                position: 'absolute',
                width: a.r * 2,
                height: a.r * 2,
                transform: [
                  { translateX: a.x - a.r },
                  { translateY: a.y - scrollY.current - a.r },
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

        {/* Game entities - Barriers */}
        {entityManager.getEntities('barriers').map((b) => (
          <View
            key={`B-${b.id}`}
            style={[
              styles.barrier,
              {
                width: b.w,
                height: b.h,
                backgroundColor: b.color || '#666',
                transform: [{ translateX: b.x }, { translateY: b.y - scrollY.current }]
              }
            ]}
          />
        ))}

        {/* Game entities - Ships */}
        {entityManager.getEntities('ships').map((s) => (
          <View
            key={`S-${s.id}`}
            style={[
              styles.ship,
              {
                width: s.r * 2,
                height: s.r * 2,
                backgroundColor: s.color || '#FF4444',
                transform: [{ translateX: s.x - s.r }, { translateY: s.y - scrollY.current - s.r }]
              }
            ]}
          />
        ))}

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
                transform: [{ translateX: p.x - 2 }, { translateY: p.y - scrollY.current - 4 }]
              }
            ]}
          />
        ))}

        {/* Player pod */}
        <View
          style={[
            styles.pod,
            {
              transform: [{ translateX: podX.current - 18 }, { translateY: podY.current - 18 }]
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

        {/* HUD */}
        {phaseManager.canPlay() && (
          <GameHUD
            level={levelManager.getCurrentLevel()}
            score={currentScore.current}
            lives={lives.current}
            maxLives={maxLives}
            shipsKilled={levelManager.getShipsKilled()}
            shipQuota={levelManager.getShipQuota()}
            progressText={levelManager.getProgressText()}
            weaponInfo={weaponSystem.getWeaponInfo()}
            energyCells={energyCells.current}
            nukesLeft={nukesLeft.current}
          />
        )}

        {/* DEBUG: Phase info */}
        <View style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 10,
          zIndex: 1001
        }}>
          <Text style={{ color: 'white', fontSize: 12 }}>Phase: {phase}</Text>
          <Text style={{ color: 'white', fontSize: 12 }}>Phase Manager: {phaseManager.getPhase()}</Text>
        </View>

        {/* UI Overlays */}
        {phase === "menu" && (
          <MainMenu
            onStart={startGame}
            leftHandedMode={leftHandedMode}
            onToggleHandedness={toggleHandedness}
            musicEnabled={audio.musicEnabled}
            onToggleMusic={toggleMusic}
            sfxEnabled={audio.sfxEnabled}
            onToggleSfx={toggleSfx}
            onShowLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {phase === "win" && (
          <VictoryScreen
            finalScore={currentScore.current}
            onBackToMenu={goMenu}
          />
        )}

        {phase === "dead" && (
          <GameOverScreen
            finalScore={currentScore.current}
            onNewGame={startGame}
            onBackToMenu={goMenu}
          />
        )}

        {phase === "respawning" && (
          <RespawnOverlay
            respawnMessage={{
              title: "LIFE LOST",
              message: "Prepare for respawn...",
              tip: "Use invulnerability wisely!"
            }}
            countdown={Math.ceil(5)} // TODO: Get from phase manager
            lives={lives.current}
            maxLives={maxLives}
            isLastLife={lives.current === 1}
            showFullMessage={true}
            quickRespawn={false}
            canSkipCountdown={true}
            leftHandedMode={leftHandedMode}
            showRespawnTips={true}
            livesLostThisSession={maxLives - lives.current}
            onSkipCountdown={() => phaseManager.skipRespawnCountdown()}
            onToggleHandedness={toggleHandedness}
            onToggleRespawnTips={() => {}}
            onToggleQuickRespawn={() => {}}
          />
        )}
      </View>

      {/* Modals */}
      {showLeaderboard && (
        <LeaderboardModal
          isVisible={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showNameEntry && (
        <NameEntryModal
          isVisible={showNameEntry}
          gameResultData={{ score: currentScore.current, level: levelManager.getCurrentLevel() }}
          playerName={playerName}
          onNameChange={setPlayerName}
          onSubmit={() => setShowNameEntry(false)}
        />
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
    textAlign: 'center',
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

  // Settings Gear Icon Styles
  settingsGear: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  settingsGearText: {
    fontSize: 18,
    textAlign: "center",
  },

  // Settings Popup Styles
  settingsPopup: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  settingsContent: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 300,
    borderWidth: 2,
    borderColor: "#00FFFF",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00FFFF",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0, 255, 255, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  settingText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  settingToggle: {
    width: 50,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  settingToggleActive: {
    backgroundColor: "#00FFFF",
  },
  settingToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  settingToggleKnobActive: {
    alignSelf: "flex-end",
  },
  settingsCloseButton: {
    backgroundColor: "#FF3366",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 8,
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsCloseText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
});