// Respawn overlay component
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface RespawnMessage {
  title: string;
  message: string;
  tip: string;
}

interface RespawnOverlayProps {
  respawnMessage: RespawnMessage;
  countdown: number;
  lives: number;
  maxLives: number;
  isLastLife: boolean;
  showFullMessage: boolean;
  quickRespawn: boolean;
  canSkipCountdown: boolean;
  leftHandedMode: boolean;
  showRespawnTips: boolean;
  livesLostThisSession: number;
  onSkipCountdown: () => void;
  onToggleHandedness: () => void;
  onToggleRespawnTips: (value: boolean) => void;
  onToggleQuickRespawn: (value: boolean) => void;
}

export const RespawnOverlay: React.FC<RespawnOverlayProps> = ({
  respawnMessage,
  countdown,
  lives,
  maxLives,
  isLastLife,
  showFullMessage,
  quickRespawn,
  canSkipCountdown,
  leftHandedMode,
  showRespawnTips,
  livesLostThisSession,
  onSkipCountdown,
  onToggleHandedness,
  onToggleRespawnTips,
  onToggleQuickRespawn,
}) => {
  // Simple flicker effect for emergency feel
  const flickerOpacity = Math.sin(Date.now() * 0.01) * 0.1 + 0.9;

  return (
    <View style={styles.overlay}>
      {/* Emergency title with subtle flicker */}
      <Text style={[
        showFullMessage ? styles.respawnTitle : styles.respawnTitleCompact,
        { opacity: flickerOpacity }
      ]}>
        {showFullMessage ? respawnMessage.title : `⚡ LIFE LOST - ${lives} REMAINING ⚡`}
      </Text>

      {/* Conditional detailed message */}
      {showFullMessage && (
        <Text style={styles.overlayText}>{respawnMessage.message}</Text>
      )}

      {/* Emergency countdown with tap-to-skip */}
      <Pressable onPress={onSkipCountdown} style={[
        styles.countdownContainer,
        { opacity: flickerOpacity }
      ]}>
        <Text style={styles.countdownNumber}>{countdown}</Text>
        <Text style={styles.countdownLabel}>
          {quickRespawn ? "Quick respawn" : "Respawning in"}
        </Text>
        {canSkipCountdown && (
          <Text style={styles.skipHint}>Tap to skip</Text>
        )}
      </Pressable>

      {/* Tips and preferences */}
      {showFullMessage && (
        <Text style={styles.respawnTip}>{respawnMessage.tip}</Text>
      )}

      {/* Compact handedness toggle */}
      <Pressable
        onPress={onToggleHandedness}
        style={styles.respawnHandednessToggle}
      >
        <Text style={styles.respawnHandednessLabel}>
          🎮 {leftHandedMode ? '👈' : '👉'}
        </Text>
        <View style={[
          styles.respawnToggleSwitch,
          !leftHandedMode && styles.respawnToggleSwitchActive
        ]}>
          <View style={[
            styles.respawnToggleKnob,
            !leftHandedMode && styles.respawnToggleKnobActive
          ]} />
        </View>
      </Pressable>

      <View style={styles.livesDisplay}>
        {Array.from({ length: maxLives }).map((_, i) => (
          <Text key={i} style={[
            styles.lifeIcon,
            i < lives ? styles.lifeActive : styles.lifeLost
          ]}>❤️</Text>
        ))}
      </View>

      {/* User preferences - only show for non-critical situations */}
      {!isLastLife && livesLostThisSession >= 2 && (
        <View style={styles.preferencesContainer}>
          <Pressable
            onPress={() => onToggleRespawnTips(!showRespawnTips)}
            style={styles.checkboxContainer}
          >
            <View style={[styles.checkbox, showRespawnTips && styles.checkboxChecked]}>
              {showRespawnTips && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Show detailed tips</Text>
          </Pressable>

          <Pressable
            onPress={() => onToggleQuickRespawn(!quickRespawn)}
            style={styles.checkboxContainer}
          >
            <View style={[styles.checkbox, quickRespawn && styles.checkboxChecked]}>
              {quickRespawn && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Quick respawn (1.5s)</Text>
          </Pressable>
        </View>
      )}
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
  respawnTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#FF4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  respawnTitleCompact: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: '#FF4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  overlayText: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  countdownContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    minWidth: 120,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B35',
    textShadowColor: '#FF4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 5,
  },
  skipHint: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 8,
    fontStyle: 'italic',
  },
  respawnTip: {
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
    fontStyle: 'italic',
  },
  respawnHandednessToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 15,
    gap: 10,
  },
  respawnHandednessLabel: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  respawnToggleSwitch: {
    width: 40,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#555',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  respawnToggleSwitchActive: {
    backgroundColor: '#4CAF50',
  },
  respawnToggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
  },
  respawnToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  livesDisplay: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  lifeIcon: {
    fontSize: 24,
  },
  lifeActive: {
    opacity: 1,
  },
  lifeLost: {
    opacity: 0.3,
  },
  preferencesContainer: {
    gap: 10,
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
});