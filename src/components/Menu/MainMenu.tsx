import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';

export interface MainMenuProps {
  onStart: () => void;
  onShowLeaderboard: () => void;
  onShowSettings: () => void;
  leftHandedMode: boolean;
  onToggleHandedness: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  subtleFade: Animated.AnimatedAddition;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStart,
  onShowLeaderboard,
  onShowSettings,
  leftHandedMode,
  onToggleHandedness,
  musicEnabled,
  onToggleMusic,
  sfxEnabled,
  onToggleSfx,
  subtleFade,
}) => {
  return (
    <View style={styles.container}>
      {/* Game Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.gameTitle}>PUPILZ</Text>
        <Text style={styles.gameSubtitle}>POD DESCENT</Text>
      </View>

      {/* Main CTA Button */}
      <Pressable
        onPress={onStart}
        style={[
          styles.menuCTA,
          { opacity: subtleFade }
        ]}
      >
        <View style={styles.menuCTAGlow} />
        <Text style={styles.menuCTAText}>DESCEND TO EARTH!</Text>
      </Pressable>

      {/* Control Toggles */}
      <View style={styles.controlsContainer}>
        {/* Handedness Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>
            Controls: {leftHandedMode ? 'Left' : 'Right'} Hand
          </Text>
          <Pressable onPress={onToggleHandedness} style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>↔️</Text>
          </Pressable>
        </View>

        {/* Audio Controls */}
        <View style={styles.audioControls}>
          <Pressable onPress={onToggleMusic} style={styles.audioToggle}>
            <Text style={styles.audioToggleText}>
              {musicEnabled ? '🎵' : '🔇'}
            </Text>
          </Pressable>
          <Pressable onPress={onToggleSfx} style={styles.audioToggle}>
            <Text style={styles.audioToggleText}>
              {sfxEnabled ? '🔊' : '🔇'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Secondary Buttons */}
      <View style={styles.secondaryButtons}>
        <Pressable onPress={onShowLeaderboard} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>🏆 LEADERBOARD</Text>
        </Pressable>

        <Pressable onPress={onShowSettings} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>⚙️ SETTINGS</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  gameTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8,
    textShadowColor: 'rgba(255,51,102,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  gameSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 8,
  },
  menuCTA: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  menuCTAGlow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    left: '-10%',
    top: '-10%',
    backgroundColor: 'rgba(255,51,102,0.3)',
    borderRadius: 30,
    zIndex: -1,
  },
  menuCTAText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  controlsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 20,
    minWidth: 40,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 16,
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  audioToggle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 25,
    minWidth: 50,
    alignItems: 'center',
  },
  audioToggleText: {
    fontSize: 20,
  },
  secondaryButtons: {
    width: '100%',
    gap: 15,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
});