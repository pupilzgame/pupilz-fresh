// Victory screen component
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface VictoryScreenProps {
  finalScore: number;
  onBackToMenu: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  finalScore,
  onBackToMenu,
}) => {
  return (
    <View style={styles.overlay}>
      <Text style={styles.overlayTitle}>EARTH REACHED!</Text>
      <Text style={styles.overlayText}>
        Congratulations Pupil! You have made it to Earth — you are one step closer to world domination!
      </Text>
      <View style={styles.finalScoreContainer}>
        <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
        <Text style={styles.finalScoreValue}>{finalScore.toLocaleString()}</Text>
      </View>
      <Pressable onPress={onBackToMenu} style={styles.startBtn}>
        <Text style={styles.startBtnText}>BACK TO MENU</Text>
      </Pressable>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#2E7D32',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  overlayText: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  finalScoreContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  finalScoreLabel: {
    fontSize: 16,
    color: '#4CAF50',
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
  startBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#66BB6A',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
});