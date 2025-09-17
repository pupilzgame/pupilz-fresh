import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScorePopup } from '../../systems/ScoringSystem';

export interface GameHUDProps {
  score: number;
  lives: number;
  level: number;
  shieldLives: number;
  shipProgress?: string;
  scorePopups: ScorePopup[];
  width: number;
  height: number;
  scrollY: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  lives,
  level,
  shieldLives,
  shipProgress,
  scorePopups,
  width,
  height,
  scrollY,
}) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top HUD */}
      <View style={styles.topHUD}>
        <View style={styles.hudLeft}>
          <Text style={styles.scoreText}>SCORE: {score.toLocaleString()}</Text>
          <Text style={styles.levelText}>LEVEL {level}</Text>
          {shipProgress && (
            <Text style={styles.shipProgress}>{shipProgress}</Text>
          )}
        </View>

        <View style={styles.hudRight}>
          <Text style={styles.livesText}>LIVES: {lives}</Text>
          {shieldLives > 0 && (
            <Text style={styles.shieldText}>SHIELDS: {shieldLives}</Text>
          )}
        </View>
      </View>

      {/* Score Popups */}
      <View style={styles.scorePopupsContainer}>
        {scorePopups.map((popup) => {
          const screenY = popup.y - scrollY;

          // Don't render if off-screen
          if (screenY < -50 || screenY > height + 50) return null;
          if (popup.x < -50 || popup.x > width + 50) return null;

          return (
            <View
              key={popup.id}
              style={[
                styles.scorePopup,
                {
                  left: popup.x - 30,
                  top: screenY - 15,
                  opacity: popup.opacity,
                  transform: [{ scale: popup.scale }],
                },
              ]}
            >
              <Text style={styles.scorePopupText}>+{popup.points}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  topHUD: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hudLeft: {
    alignItems: 'flex-start',
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 4,
  },
  shipProgress: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
  },
  livesText: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  shieldText: {
    color: '#9FFFB7',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
  },
  scorePopupsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scorePopup: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePopupText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});