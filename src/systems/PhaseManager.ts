// Game phase management system
import { useRef, useCallback } from 'react';

export type GamePhase = "menu" | "playing" | "dead" | "win" | "respawning";

export interface PhaseState {
  phase: GamePhase;
  respawnCountdown: number;
  timeSec: number;
  canSkipCountdown: boolean;
  finalDeathSequence: boolean;
  victoryBeamActive: boolean;
  victoryBeamProgress: number;
}

export interface PhaseConfig {
  maxLives: number;
  respawnDelay: number;
  countdownSkipDelay: number;
  victoryBeamDuration: number;
}

export interface PhaseCallbacks {
  onGameStart: () => void;
  onGameOver: () => void;
  onVictory: () => void;
  onRespawn: () => void;
  onPhaseChange: (newPhase: GamePhase, oldPhase: GamePhase) => void;
  playRespawnSound: () => void;
  playMissionFailedMusic: () => void;
  playEarthReachedMusic: () => void;
}

export interface PhaseManager {
  // State
  getPhase: () => GamePhase;
  getPhaseState: () => PhaseState;

  // Phase transitions
  setPhase: (phase: GamePhase) => void;
  startGame: () => void;
  endGame: (victory?: boolean) => void;
  startRespawn: () => void;
  skipRespawnCountdown: () => void;

  // Victory sequence
  startVictorySequence: () => void;
  updateVictorySequence: (deltaTime: number) => void;

  // Update
  update: (deltaTime: number, lives: number) => void;

  // Utility
  canPlay: () => boolean;
  isRespawning: () => boolean;
  shouldShowRespawnOverlay: () => boolean;
  getRespawnProgress: () => number;
}

const DEFAULT_CONFIG: PhaseConfig = {
  maxLives: 3,
  respawnDelay: 5.0,
  countdownSkipDelay: 1.5,
  victoryBeamDuration: 8.0,
};

export const usePhaseManager = (
  callbacks: PhaseCallbacks,
  config: Partial<PhaseConfig> = {}
): PhaseManager => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Phase state
  const phaseState = useRef<PhaseState>({
    phase: "menu",
    respawnCountdown: 0,
    timeSec: 0,
    canSkipCountdown: false,
    finalDeathSequence: false,
    victoryBeamActive: false,
    victoryBeamProgress: 0,
  });

  // Active intervals and timeouts
  const activeInterval = useRef<NodeJS.Timeout | null>(null);

  // Get current phase
  const getPhase = useCallback((): GamePhase => {
    return phaseState.current.phase;
  }, []);

  // Get full phase state
  const getPhaseState = useCallback((): PhaseState => {
    return { ...phaseState.current };
  }, []);

  // Set phase with callbacks
  const setPhase = useCallback((newPhase: GamePhase) => {
    const oldPhase = phaseState.current.phase;
    if (oldPhase === newPhase) return;

    console.log(`🎮 PHASE MANAGER - Changing phase: ${oldPhase} → ${newPhase}`);
    phaseState.current.phase = newPhase;

    // Clean up any active intervals
    if (activeInterval.current) {
      clearInterval(activeInterval.current);
      activeInterval.current = null;
    }

    // Phase-specific initialization
    switch (newPhase) {
      case "menu":
        phaseState.current.respawnCountdown = 0;
        phaseState.current.canSkipCountdown = false;
        phaseState.current.finalDeathSequence = false;
        phaseState.current.victoryBeamActive = false;
        break;

      case "playing":
        phaseState.current.respawnCountdown = 0;
        phaseState.current.canSkipCountdown = false;
        break;

      case "respawning":
        phaseState.current.respawnCountdown = finalConfig.respawnDelay;
        phaseState.current.canSkipCountdown = false;
        phaseState.current.finalDeathSequence = false;

        // Enable skip after delay
        setTimeout(() => {
          phaseState.current.canSkipCountdown = true;
        }, finalConfig.countdownSkipDelay * 1000);
        break;

      case "dead":
        phaseState.current.finalDeathSequence = true;
        phaseState.current.respawnCountdown = 0;
        callbacks.playMissionFailedMusic();
        break;

      case "win":
        phaseState.current.victoryBeamActive = true;
        phaseState.current.victoryBeamProgress = 0;
        callbacks.playEarthReachedMusic();
        break;
    }

    callbacks.onPhaseChange(newPhase, oldPhase);
  }, [callbacks, finalConfig]);

  // Start new game
  const startGame = useCallback(() => {
    console.log('🎮 PHASE MANAGER - Starting new game');
    phaseState.current.timeSec = 0;
    phaseState.current.finalDeathSequence = false;
    phaseState.current.victoryBeamActive = false;
    phaseState.current.victoryBeamProgress = 0;
    setPhase("playing");
    callbacks.onGameStart();
  }, [setPhase, callbacks]);

  // End game (victory or defeat)
  const endGame = useCallback((victory: boolean = false) => {
    console.log(`🎮 PHASE MANAGER - Ending game: ${victory ? 'VICTORY' : 'DEFEAT'}`);

    if (victory) {
      setPhase("win");
      callbacks.onVictory();
    } else {
      setPhase("dead");
      callbacks.onGameOver();
    }
  }, [setPhase, callbacks]);

  // Start respawn sequence
  const startRespawn = useCallback(() => {
    console.log('🎮 PHASE MANAGER - Starting respawn sequence');
    setPhase("respawning");

    // Start countdown interval
    activeInterval.current = setInterval(() => {
      phaseState.current.respawnCountdown -= 0.1;

      if (phaseState.current.respawnCountdown <= 0) {
        if (activeInterval.current) {
          clearInterval(activeInterval.current);
          activeInterval.current = null;
        }

        console.log('🎮 PHASE MANAGER - Respawn countdown complete');
        setPhase("playing");
        callbacks.onRespawn();
        callbacks.playRespawnSound();
      }
    }, 100);
  }, [setPhase, callbacks]);

  // Skip respawn countdown
  const skipRespawnCountdown = useCallback(() => {
    if (!phaseState.current.canSkipCountdown || phaseState.current.phase !== "respawning") {
      return;
    }

    console.log('🎮 PHASE MANAGER - Skipping respawn countdown');

    // Clear countdown interval
    if (activeInterval.current) {
      clearInterval(activeInterval.current);
      activeInterval.current = null;
    }

    phaseState.current.respawnCountdown = 0;
    setPhase("playing");
    callbacks.onRespawn();
    callbacks.playRespawnSound();
  }, [setPhase, callbacks]);

  // Start victory sequence
  const startVictorySequence = useCallback(() => {
    console.log('🎮 PHASE MANAGER - Starting victory sequence');
    phaseState.current.victoryBeamActive = true;
    phaseState.current.victoryBeamProgress = 0;
  }, []);

  // Update victory sequence
  const updateVictorySequence = useCallback((deltaTime: number) => {
    if (!phaseState.current.victoryBeamActive) return;

    phaseState.current.victoryBeamProgress += deltaTime;

    // Victory sequence complete
    if (phaseState.current.victoryBeamProgress >= finalConfig.victoryBeamDuration) {
      phaseState.current.victoryBeamActive = false;
      endGame(true);
    }
  }, [endGame, finalConfig]);

  // Main update function
  const update = useCallback((deltaTime: number, lives: number) => {
    phaseState.current.timeSec += deltaTime;

    // Update victory sequence if active
    if (phaseState.current.victoryBeamActive) {
      updateVictorySequence(deltaTime);
    }

    // Check for game over condition
    if (phaseState.current.phase === "playing" && lives <= 0) {
      endGame(false);
    }
  }, [updateVictorySequence, endGame]);

  // Utility functions
  const canPlay = useCallback((): boolean => {
    return phaseState.current.phase === "playing";
  }, []);

  const isRespawning = useCallback((): boolean => {
    return phaseState.current.phase === "respawning";
  }, []);

  const shouldShowRespawnOverlay = useCallback((): boolean => {
    return phaseState.current.phase === "respawning" || phaseState.current.phase === "dead";
  }, []);

  const getRespawnProgress = useCallback((): number => {
    if (phaseState.current.phase !== "respawning") return 0;
    return 1 - (phaseState.current.respawnCountdown / finalConfig.respawnDelay);
  }, [finalConfig]);

  return {
    // State
    getPhase,
    getPhaseState,

    // Phase transitions
    setPhase,
    startGame,
    endGame,
    startRespawn,
    skipRespawnCountdown,

    // Victory sequence
    startVictorySequence,
    updateVictorySequence,

    // Update
    update,

    // Utility
    canPlay,
    isRespawning,
    shouldShowRespawnOverlay,
    getRespawnProgress,
  };
};

// Phase transition helpers
export const PhaseTransitions = {
  // Check if transition is valid
  isValidTransition(from: GamePhase, to: GamePhase): boolean {
    const validTransitions: Record<GamePhase, GamePhase[]> = {
      menu: ["playing"],
      playing: ["respawning", "dead", "win", "menu"],
      respawning: ["playing", "dead", "menu"],
      dead: ["menu", "playing"],
      win: ["menu", "playing"],
    };

    return validTransitions[from]?.includes(to) ?? false;
  },

  // Get next logical phase
  getNextPhase(current: GamePhase, lives: number, victory: boolean = false): GamePhase {
    switch (current) {
      case "menu":
        return "playing";

      case "playing":
        if (victory) return "win";
        if (lives <= 0) return "dead";
        return "respawning";

      case "respawning":
        return "playing";

      case "dead":
      case "win":
        return "menu";

      default:
        return current;
    }
  },

  // Get phase display name
  getPhaseDisplayName(phase: GamePhase): string {
    const names: Record<GamePhase, string> = {
      menu: "Main Menu",
      playing: "Playing",
      respawning: "Respawning",
      dead: "Game Over",
      win: "Victory",
    };

    return names[phase] ?? phase;
  },
};

// Phase-based configurations
export const PhaseConfigs = {
  // Get phase-specific UI settings
  getUIConfig(phase: GamePhase) {
    const configs = {
      menu: {
        showHUD: false,
        showMenu: true,
        allowInput: true,
        showParticles: true,
      },
      playing: {
        showHUD: true,
        showMenu: false,
        allowInput: true,
        showParticles: true,
      },
      respawning: {
        showHUD: true,
        showMenu: false,
        allowInput: false,
        showParticles: true,
      },
      dead: {
        showHUD: false,
        showMenu: false,
        allowInput: true,
        showParticles: true,
      },
      win: {
        showHUD: false,
        showMenu: false,
        allowInput: true,
        showParticles: true,
      },
    };

    return configs[phase];
  },

  // Get phase-specific timing settings
  getTimingConfig(phase: GamePhase) {
    const configs = {
      menu: { updateRate: 20, renderRate: 30 },
      playing: { updateRate: 60, renderRate: 60 },
      respawning: { updateRate: 10, renderRate: 30 },
      dead: { updateRate: 10, renderRate: 30 },
      win: { updateRate: 30, renderRate: 60 },
    };

    return configs[phase];
  },
};