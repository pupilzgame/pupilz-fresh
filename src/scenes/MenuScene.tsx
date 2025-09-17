import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../state/store';
import { useAudioSystem } from '../systems/AudioSystem';
import { MainMenu } from '../components/Menu/MainMenu';

export default function MenuScene() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    startGame,
    leftHandedMode,
    toggleHandedness,
    toggleLeaderboard
  } = useGameStore();

  const audio = useAudioSystem();

  // Animation state for the original menu
  const [animPhase, setAnimPhase] = useState(0);

  // Game world stars (same as GameScene for authentic background)
  const gameStarsRef = useRef<Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}>>([]);

  // Initialize game world stars (same as GameScene for authentic background)
  useEffect(() => {
    const initStars: Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}> = [];
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
          opacity: layer.opacity * 0.6 // Reduced opacity for "screened out" effect
        });
      }
    });
    gameStarsRef.current = initStars;

    // Animation loop for subtle effects and star movement
    const interval = setInterval(() => {
      setAnimPhase(prev => prev + 1);

      // Slowly animate stars for the "screened out" game world effect
      for (const s of gameStarsRef.current) {
        s.y += 0.3 * s.parallax; // Slow downward drift
        if (s.y > height + 4) {
          s.y = -4;
          s.x = Math.random() * width;
        }
      }
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
      {/* Screened out game world background - authentic stars from GameScene */}
      <View style={styles.gameWorldBackground} pointerEvents="none">
        {gameStarsRef.current.map((s) => (
          <View
            key={s.id}
            style={[styles.star, {
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              transform: [{ translateX: s.x }, { translateY: s.y + insets.top }]
            }]}
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
  gameWorldBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#8FB7FF',
    borderRadius: 2,
    zIndex: 0,
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