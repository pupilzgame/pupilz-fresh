import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore } from '../state/store';
import { useAudioSystem } from '../systems/AudioSystem';

export default function MenuScene() {
  const {
    startGame,
    leftHandedMode,
    toggleHandedness,
    toggleLeaderboard
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
      {/* Background stars effect */}
      <View style={styles.content}>
        <Text style={styles.title}>PUPILZ POD DESCENT</Text>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.button} onPress={handleStartGame}>
            <Text style={styles.buttonText}>🚀 START GAME</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={() => toggleLeaderboard()}>
            <Text style={styles.buttonText}>🏆 LEADERBOARD</Text>
          </Pressable>

          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>SETTINGS</Text>

            <Pressable style={styles.settingButton} onPress={toggleHandedness}>
              <Text style={styles.settingText}>
                🖐️ {leftHandedMode ? 'LEFT-HANDED' : 'RIGHT-HANDED'}
              </Text>
            </Pressable>

            <Pressable style={styles.settingButton} onPress={toggleMusic}>
              <Text style={styles.settingText}>
                🎵 MUSIC: {audio.musicEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>

            <Pressable style={styles.settingButton} onPress={toggleSfx}>
              <Text style={styles.settingText}>
                🔊 SFX: {audio.sfxEnabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
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