import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useGameStore } from '../state/store';
import { useAudioSystem } from '../systems/AudioSystem';
import EnhancedMenu from '../components/Menu/EnhancedMenu';
import { LeaderboardModal } from '../components/UI/LeaderboardModal';

export default function MenuScene() {
  const {
    startGame,
    leftHandedMode,
    toggleHandedness,
    toggleLeaderboard,
    showLeaderboard,
    score
  } = useGameStore();

  const audio = useAudioSystem();

  const handleStartGame = () => {
    startGame();
    audio.playGameplayMusic();
  };

  const toggleMusic = () => {
    audio.toggleMusic();
  };

  const toggleSfx = () => {
    audio.toggleSfx();
  };

  return (
    <View style={styles.container}>
      {/* Enhanced menu includes its own animated star background */}

      {/* Enhanced Menu component - original beautiful design restored */}
      <EnhancedMenu
        onStart={handleStartGame}
        onShowLeaderboard={() => toggleLeaderboard()}
        leftHandedMode={leftHandedMode}
        onToggleHandedness={toggleHandedness}
        musicEnabled={audio.musicEnabled}
        onToggleMusic={toggleMusic}
        sfxEnabled={audio.sfxEnabled}
        onToggleSfx={toggleSfx}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        visible={showLeaderboard}
        entries={[]} // TODO: Load actual leaderboard data
        onClose={() => toggleLeaderboard()}
        personalBest={score}
        lastRank={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060913',
  },
});