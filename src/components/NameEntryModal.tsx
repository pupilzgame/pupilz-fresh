// Name entry modal for high scores
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';

interface GameResultData {
  score: number;
  level: number;
}

interface NameEntryModalProps {
  isVisible: boolean;
  gameResultData: GameResultData | null;
  playerName: string;
  telegramUsername?: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}

export const NameEntryModal: React.FC<NameEntryModalProps> = ({
  isVisible,
  gameResultData,
  playerName,
  telegramUsername,
  onNameChange,
  onSubmit,
}) => {
  if (!isVisible || !gameResultData) return null;

  const handleTextChange = (text: string) => {
    // Auto-uppercase and limit based on source
    const maxLength = telegramUsername ? 12 : 12;
    const cleanText = text.toUpperCase().slice(0, maxLength);
    onNameChange(cleanText);
  };

  return (
    <View style={styles.nameEntryOverlay} pointerEvents="box-none">
      <View style={styles.nameEntryModal} pointerEvents="auto">
        <Text style={styles.nameEntryTitle}>🏆 HIGH SCORE! 🏆</Text>
        <Text style={styles.nameEntrySubtitle}>
          Score: {gameResultData.score.toLocaleString()} • Level: {gameResultData.level}
        </Text>
        <Text style={styles.nameEntryPrompt}>Enter your pilot name:</Text>

        {telegramUsername && (
          <Text style={styles.telegramUserDetected}>
            🤖 Telegram User Detected: @{telegramUsername}
          </Text>
        )}

        <TextInput
          style={[
            styles.nameEntryInput,
            playerName.trim() && styles.nameEntryInputActive,
            telegramUsername && styles.nameEntryInputTelegram
          ]}
          value={playerName}
          onChangeText={handleTextChange}
          placeholder={telegramUsername ? telegramUsername.toUpperCase() : "ACE"}
          placeholderTextColor={telegramUsername ? "#4CAF50" : "#888"}
          maxLength={12}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          autoFocus={!telegramUsername} // Don't auto-focus if Telegram detected
          selectTextOnFocus={true}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          editable={true}
          // React Native Web specific fixes
          {...(Platform.OS === 'web' && {
            // @ts-ignore
            style: {
              ...StyleSheet.flatten([
                styles.nameEntryInput,
                playerName.trim() && styles.nameEntryInputActive,
                telegramUsername && styles.nameEntryInputTelegram
              ]),
              outline: 'none',
              userSelect: 'text',
              pointerEvents: 'auto'
            }
          })}
        />

        <View style={styles.nameEntryButtons}>
          <Pressable
            onPress={onSubmit}
            disabled={!playerName.trim()}
            style={[
              styles.nameEntryButton,
              styles.nameEntrySubmit,
              !playerName.trim() && styles.nameEntryButtonDisabled
            ]}
          >
            <Text style={[
              styles.nameEntryButtonText,
              !playerName.trim() && styles.nameEntryButtonTextDisabled
            ]}>
              SUBMIT
            </Text>
          </Pressable>
        </View>

        <Text style={styles.nameEntryHint}>12 characters max • Will be shown in CAPS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nameEntryOverlay: {
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
  nameEntryModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  nameEntryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: '#FF8F00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  nameEntrySubtitle: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  nameEntryPrompt: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 15,
  },
  telegramUserDetected: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  nameEntryInput: {
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  nameEntryInputActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#2E2E2E',
  },
  nameEntryInputTelegram: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  nameEntryButtons: {
    alignItems: 'center',
    marginBottom: 15,
  },
  nameEntryButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    minWidth: 120,
  },
  nameEntrySubmit: {
    backgroundColor: '#4CAF50',
    borderColor: '#66BB6A',
  },
  nameEntryButtonDisabled: {
    backgroundColor: '#555',
    borderColor: '#777',
  },
  nameEntryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  nameEntryButtonTextDisabled: {
    color: '#999',
  },
  nameEntryHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});