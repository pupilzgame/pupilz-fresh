import { useRef, useState } from 'react';

export type Phase = "menu" | "playing" | "respawning" | "game-over" | "high-score" | "leaderboard" | "settings";

export interface GameState {
  // Phase management
  phase: Phase;
  setPhase: (phase: Phase) => void;

  // Score and level
  score: number;
  setScore: (score: number) => void;
  level: number;
  setLevel: (level: number) => void;

  // Lives and health
  lives: number;
  setLives: (lives: number) => void;
  shieldLives: number;
  setShieldLives: (shieldLives: number) => void;

  // Player state
  invulnTime: number;
  setInvulnTime: (time: number) => void;

  // Game settings
  leftHandedMode: boolean;
  setLeftHandedMode: (enabled: boolean) => void;

  // UI state
  showNameEntry: boolean;
  setShowNameEntry: (show: boolean) => void;
  showLeaderboard: boolean;
  setShowLeaderboard: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Player name
  playerName: string;
  setPlayerName: (name: string) => void;
  telegramUsername: string | null;
  setTelegramUsername: (username: string | null) => void;

  // Game result data
  gameResultData: { score: number; level: number; victory: boolean } | null;
  setGameResultData: (data: { score: number; level: number; victory: boolean } | null) => void;

  // Reset functions
  resetGame: () => void;
  hardReset: () => void;
}

export const useGameState = (): GameState => {
  // Phase state
  const [phase, setPhase] = useState<Phase>("menu");

  // Score and progression
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);

  // Lives and health
  const [lives, setLives] = useState(3);
  const [shieldLives, setShieldLives] = useState(0);
  const [invulnTime, setInvulnTime] = useState(0);

  // Settings
  const [leftHandedMode, setLeftHandedMode] = useState(false);

  // UI state
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Player data
  const [playerName, setPlayerName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);

  // Game result
  const [gameResultData, setGameResultData] = useState<{ score: number; level: number; victory: boolean } | null>(null);

  const resetGame = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setShieldLives(0);
    setInvulnTime(0);
    setShowNameEntry(false);
    setGameResultData(null);
  };

  const hardReset = () => {
    resetGame();
    setPhase("menu");
    setShowLeaderboard(false);
    setShowSettings(false);
  };

  return {
    // Phase management
    phase,
    setPhase,

    // Score and level
    score,
    setScore,
    level,
    setLevel,

    // Lives and health
    lives,
    setLives,
    shieldLives,
    setShieldLives,

    // Player state
    invulnTime,
    setInvulnTime,

    // Game settings
    leftHandedMode,
    setLeftHandedMode,

    // UI state
    showNameEntry,
    setShowNameEntry,
    showLeaderboard,
    setShowLeaderboard,
    showSettings,
    setShowSettings,

    // Player name
    playerName,
    setPlayerName,
    telegramUsername,
    setTelegramUsername,

    // Game result data
    gameResultData,
    setGameResultData,

    // Reset functions
    resetGame,
    hardReset,
  };
};