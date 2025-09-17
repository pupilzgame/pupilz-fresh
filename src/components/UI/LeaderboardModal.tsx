import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  level: number;
  victory: boolean;
  timestamp: number;
  achievements: string[];
}

export interface LeaderboardModalProps {
  visible: boolean;
  entries: LeaderboardEntry[];
  onClose: () => void;
  personalBest: number;
  lastRank: number | null;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  visible,
  entries,
  onClose,
  personalBest,
  lastRank,
}) => {
  if (!visible) return null;

  const formatScore = (score: number): string => {
    return score.toLocaleString();
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getAchievementEmoji = (achievement: string): string => {
    switch (achievement) {
      case 'EARTH_REACHED': return '🌍';
      case 'CENTURION': return '💯';
      case 'ELITE_PILOT': return '⭐';
      case 'BOSS_FIGHTER': return '💀';
      default: return '🏆';
    }
  };

  const getRankSuffix = (rank: number): string => {
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>🏆 TOP PILOTS</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Personal Stats */}
        <View style={styles.personalStats}>
          <Text style={styles.personalStatsTitle}>YOUR BEST</Text>
          <View style={styles.personalStatsRow}>
            <Text style={styles.personalStatsText}>
              Score: {formatScore(personalBest)}
            </Text>
            {lastRank && (
              <Text style={styles.personalStatsText}>
                Rank: #{lastRank}{getRankSuffix(lastRank)}
              </Text>
            )}
          </View>
        </View>

        {/* Leaderboard */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No scores yet!</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to reach Earth</Text>
            </View>
          ) : (
            entries.map((entry, index) => (
              <View key={entry.id} style={styles.entryRow}>
                <View style={styles.entryRank}>
                  <Text style={styles.entryRankText}>
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.entryInfo}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {entry.playerName}
                    </Text>
                    <Text style={styles.entryScore}>
                      {formatScore(entry.score)}
                    </Text>
                  </View>

                  <View style={styles.entryDetails}>
                    <Text style={styles.entryLevel}>
                      Level {entry.level}
                    </Text>
                    {entry.victory && (
                      <Text style={styles.entryVictory}>🌍 EARTH REACHED</Text>
                    )}
                    <Text style={styles.entryDate}>
                      {formatDate(entry.timestamp)}
                    </Text>
                  </View>

                  {entry.achievements.length > 0 && (
                    <View style={styles.entryAchievements}>
                      {entry.achievements.map((achievement, idx) => (
                        <Text key={idx} style={styles.achievementBadge}>
                          {getAchievementEmoji(achievement)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎯 Reach Earth to claim your place among the elite pilots
          </Text>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.3)',
  },
  title: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  personalStats: {
    padding: 15,
    backgroundColor: 'rgba(79,195,247,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.2)',
  },
  personalStatsTitle: {
    color: '#4FC3F7',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'center',
  },
  personalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  personalStatsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#CCCCCC',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#888888',
    fontSize: 14,
  },
  entryRow: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  entryRank: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryRankText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '900',
  },
  entryInfo: {
    flex: 1,
    marginLeft: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  entryScore: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '900',
  },
  entryDetails: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 10,
  },
  entryLevel: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  entryVictory: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '700',
  },
  entryDate: {
    color: '#888888',
    fontSize: 10,
  },
  entryAchievements: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  achievementBadge: {
    fontSize: 12,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,215,0,0.3)',
  },
  footerText: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});