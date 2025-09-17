// Game over screen component
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface GameOverScreenProps {
  finalScore: number;
  onNewGame: () => void;
  onBackToMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  finalScore,
  onNewGame,
  onBackToMenu,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.missionFailedText}>
        <Text style={styles.overlayText}>Your mission ends here, Pupil.</Text>
        <Text style={styles.overlayText}>Return to base for reassignment.</Text>
        <Text style={styles.overlayText}>The galaxy needs better-trained pilots.</Text>
      </View>
      <View style={styles.finalScoreContainer}>
        <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
        <Text style={styles.finalScoreValue}>{finalScore.toLocaleString()}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable onPress={onNewGame} style={styles.startBtn}>
          <Text style={styles.startBtnText}>NEW MISSION</Text>
        </Pressable>
        <Pressable onPress={onBackToMenu} style={[styles.startBtn, styles.secondaryBtn]}>
          <Text style={[styles.startBtnText, styles.secondaryBtnText]}>RETURN TO MOTHERSHIP</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  missionFailedText: {
    marginBottom: 30,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  finalScoreContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  finalScoreLabel: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  finalScoreValue: {
    fontSize: 32,
    color: '#FFD700',
    fontWeight: 'bold',
    textShadowColor: '#FF8F00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  buttonContainer: {
    gap: 15,
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#EF5350',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 200,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#999',
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  secondaryBtnText: {
    color: '#CCCCCC',
  },
});