import { create } from 'zustand';

export type GamePhase = "menu" | "game" | "results" | "respawning";

interface GameState {
  // Phase management
  gamePhase: GamePhase;

  // Score and progress
  score: number;
  level: number;
  lives: number;
  maxLives: number;

  // Game entities and state
  podX: number;
  podY: number;
  scrollY: number;
  worldV: number;

  // UI state
  showLeaderboard: boolean;
  showNameEntry: boolean;
  leftHandedMode: boolean;

  // Actions
  startGame: () => void;
  endGame: (victory?: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  reset: () => void;

  // Score management
  addScore: (points: number) => void;
  setScore: (score: number) => void;

  // Game state updates
  updatePodPosition: (x: number, y: number) => void;
  updateWorld: (scrollY: number, worldV: number) => void;
  setLives: (lives: number) => void;
  setLevel: (level: number) => void;

  // UI actions
  toggleLeaderboard: () => void;
  toggleNameEntry: () => void;
  toggleHandedness: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  gamePhase: "menu",
  score: 0,
  level: 1,
  lives: 3,
  maxLives: 3,
  podX: 200, // Will be updated based on screen width
  podY: 400, // Will be updated based on screen height
  scrollY: 0,
  worldV: 95,
  showLeaderboard: false,
  showNameEntry: false,
  leftHandedMode: false,

  // Phase management
  startGame: () => {
    console.log('📦 STORE: startGame called');
    console.log('📦 STORE: Setting gamePhase to "game"');
    set({
      gamePhase: "game",
      score: 0,
      level: 1,
      lives: 3,
      scrollY: 0,
      worldV: 95,
      showLeaderboard: false,
      showNameEntry: false
    });
    console.log('📦 STORE: Game state updated');
  },

  endGame: (victory = false) => set({
    gamePhase: "results"
  }),

  setPhase: (phase) => set({ gamePhase: phase }),

  reset: () => set({
    gamePhase: "menu",
    score: 0,
    level: 1,
    lives: 3,
    scrollY: 0,
    worldV: 95,
    showLeaderboard: false,
    showNameEntry: false
  }),

  // Score management
  addScore: (points) => set(state => ({
    score: state.score + points
  })),

  setScore: (score) => set({ score }),

  // Game state updates
  updatePodPosition: (x, y) => set({ podX: x, podY: y }),

  updateWorld: (scrollY, worldV) => set({ scrollY, worldV }),

  setLives: (lives) => set({ lives }),

  setLevel: (level) => set({ level }),

  // UI actions
  toggleLeaderboard: () => set(state => ({
    showLeaderboard: !state.showLeaderboard
  })),

  toggleNameEntry: () => set(state => ({
    showNameEntry: !state.showNameEntry
  })),

  toggleHandedness: () => set(state => ({
    leftHandedMode: !state.leftHandedMode
  })),
}));