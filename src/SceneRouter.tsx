import React from 'react';
import { useGameStore } from './state/store';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import ResultsScene from './scenes/ResultsScene';

export default function SceneRouter() {
  const gamePhase = useGameStore(s => s.gamePhase);

  console.log('🎯 SCENE ROUTER: Current gamePhase =', gamePhase);

  switch (gamePhase) {
    case "menu":
      return <MenuScene />;
    case "game":
      return <GameScene />;
    case "results":
      return <ResultsScene />;
    case "respawning":
      // For now, keep it in game scene with respawn handling
      return <GameScene />;
    default:
      return <MenuScene />;
  }
}