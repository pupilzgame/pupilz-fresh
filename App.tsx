import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    useWindowDimensions,
    Platform,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFullScreenPWA } from './useFullScreenPWA';
import './global.css';

// Retention System Types
interface DailyMission {
  id: string;
  description: string;
  type: 'kills' | 'levels' | 'bosses' | 'survival';
  target: number;
  progress: number;
  tier: 'easy' | 'medium' | 'hard';
  reward: { nukes?: number; energyCells?: number; };
  completed: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'combat' | 'exploration' | 'survival' | 'mastery' | 'special';
  target: number;
  progress: number;
  unlocked: boolean;
  reward: { nukes?: number; energyCells?: number; };
}

interface RetentionData {
  lastLoginDate: string;
  streakCount: number;
  streakFreezes: number;
  totalPlaytime: number;
  dailyMissions: DailyMission[];
  achievements: Achievement[];
}

function AppContent() {
  console.log('🔍 DEBUG: AppContent rendering - WITH UI COMPONENTS');
  
  useFullScreenPWA();
  
  // Basic game state
  const [gameState, setGameState] = useState('menu');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  
  // Retention system state
  const dailyMissions = useRef<DailyMission[]>([]);
  const achievements = useRef<Achievement[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  
  // LocalStorage operations with error handling
  const saveRetentionData = (data: RetentionData) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('pupilz_retention', JSON.stringify(data));
        console.log('💾 Retention data saved to localStorage');
      }
    } catch (error) {
      console.error('❌ Failed to save retention data:', error);
    }
  };

  const loadRetentionData = (): RetentionData | null => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('pupilz_retention');
        if (stored) {
          const data = JSON.parse(stored);
          console.log('📂 Retention data loaded from localStorage');
          return data;
        }
      }
    } catch (error) {
      console.error('❌ Failed to load retention data:', error);
    }
    return null;
  };

  // Initialize retention system
  const initializeRetentionSystem = () => {
    try {
      console.log('🔄 Initializing retention system...');
      
      // Try to load existing data
      const existingData = loadRetentionData();
      
      if (existingData) {
        dailyMissions.current = existingData.dailyMissions || [];
        setStreakCount(existingData.streakCount || 0);
        console.log('✅ Loaded existing retention data');
      } else {
        // Generate fresh daily missions
        const missions: DailyMission[] = [
          {
            id: 'daily_kills_easy',
            description: 'Destroy 10 enemy ships',
            type: 'kills',
            target: 10,
            progress: 0,
            tier: 'easy',
            reward: { nukes: 1 },
            completed: false
          }
        ];
        
        dailyMissions.current = missions;
        console.log('✅ Created fresh retention data');
      }
    } catch (error) {
      console.error('❌ Retention system initialization failed:', error);
      dailyMissions.current = [];
    }
  };
  
  useEffect(() => {
    initializeRetentionSystem();
  }, []);
  
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#060913',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Text style={{
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold'
      }}>
        🔍 DEBUG WITH UI
      </Text>
      <Text style={{
        color: '#4A90E2',
        fontSize: 16,
        marginTop: 10
      }}>
        Step 6: LocalStorage added (Streak: {streakCount})
      </Text>
      <Text style={{
        color: '#8FB7FF',
        fontSize: 14,
        marginTop: 5
      }}>
        Step 7: Adding retention UI...
      </Text>
      
      {/* Retention System UI Test */}
      <View style={{ marginTop: 20, padding: 10, backgroundColor: '#1a1a2e', borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          🎯 Daily Mission
        </Text>
        {dailyMissions.current && dailyMissions.current.length > 0 ? (
          <Text style={{ color: '#4A90E2', fontSize: 12, marginTop: 5 }}>
            {dailyMissions.current[0].description} ({dailyMissions.current[0].progress}/{dailyMissions.current[0].target})
          </Text>
        ) : (
          <Text style={{ color: '#666', fontSize: 12, marginTop: 5 }}>
            No missions loaded
          </Text>
        )}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
