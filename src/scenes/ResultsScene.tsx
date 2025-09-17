import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore } from '../state/store';

export default function ResultsScene() {
  const { score, level, reset, toggleNameEntry } = useGameStore();

  const handleBackToMenu = () => {
    reset();
  };

  const handlePlayAgain = () => {
    reset();
    useGameStore.getState().startGame();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MISSION COMPLETE</Text>

        <View style={styles.statsContainer}>
          <Text style={styles.statText}>FINAL SCORE</Text>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>

          <Text style={styles.statText}>LEVEL REACHED</Text>
          <Text style={styles.levelText}>{level}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.button} onPress={handlePlayAgain}>
            <Text style={styles.buttonText}>🚀 PLAY AGAIN</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={() => toggleNameEntry()}>
            <Text style={styles.buttonText}>💾 SAVE SCORE</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleBackToMenu}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>← MAIN MENU</Text>
          </Pressable>
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#39D3FF',
    textAlign: 'center',
    marginBottom: 40,
    textShadowColor: '#0AA3C2',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 10,
  },
  statText: {
    color: '#8FB7FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreText: {
    color: '#FFE486',
    fontSize: 48,
    fontWeight: 'bold',
    textShadowColor: '#FFA500',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  levelText: {
    color: '#FF6B35',
    fontSize: 32,
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 15,
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#39D3FF',
  },
  secondaryButtonText: {
    color: '#39D3FF',
  },
});