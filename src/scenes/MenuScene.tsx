import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { useGameStore } from '../state/store';
import { useAudioSystem } from '../systems/AudioSystem';
import { MainMenu } from '../components/Menu/MainMenu';

export default function MenuScene() {
  const { width, height } = useWindowDimensions();
  const {
    startGame,
    leftHandedMode,
    toggleHandedness,
    toggleLeaderboard
  } = useGameStore();

  const audio = useAudioSystem();

  // Animation state for the original menu
  const [animPhase, setAnimPhase] = useState(0);
  const menuStarsRef = useRef<Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}>>([]);

  // Initialize menu stars animation (from the original)
  useEffect(() => {
    const stars: Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}> = [];
    const layers = [
      { count: 15, parallax: 0.3, size: 2, opacity: 0.4 },
      { count: 12, parallax: 0.6, size: 3, opacity: 0.6 },
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

    // Animation loop for subtle effects
    const interval = setInterval(() => {
      setAnimPhase(prev => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [width, height]);

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

  const handleShowSettings = () => {
    // Could implement settings modal later
  };

  // Create the subtle fade animation value
  const subtleFade = new Animated.Value(0.85 + Math.sin(animPhase * 0.06) * 0.15);

  return (
    <View style={styles.container}>
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
              backgroundColor: '#8FB7FF',
              borderRadius: star.size / 2,
              opacity: star.opacity * (0.7 + Math.sin((animPhase + star.x) * 0.02) * 0.3),
            }}
          />
        ))}
      </View>

      {/* Original MainMenu component */}
      <MainMenu
        onStart={handleStartGame}
        onShowLeaderboard={() => toggleLeaderboard()}
        onShowSettings={handleShowSettings}
        leftHandedMode={leftHandedMode}
        onToggleHandedness={toggleHandedness}
        musicEnabled={audio.musicEnabled}
        onToggleMusic={toggleMusic}
        sfxEnabled={audio.sfxEnabled}
        onToggleSfx={toggleSfx}
        subtleFade={subtleFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060913',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#39D3FF',
    textAlign: 'center',
    marginBottom: 60,
    textShadowColor: '#0AA3C2',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 20,
  },
  button: {
    backgroundColor: '#39D3FF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#0AA3C2',
    minWidth: 200,
  },
  buttonText: {
    color: '#060913',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  settingsContainer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 10,
  },
  settingsTitle: {
    color: '#8FB7FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  settingButton: {
    backgroundColor: 'rgba(57, 211, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(57, 211, 255, 0.3)',
    minWidth: 180,
  },
  settingText: {
    color: '#8FB7FF',
    fontSize: 14,
    textAlign: 'center',
  },
});