import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  console.log('🔍 DEBUG: App component rendering - MINIMAL VERSION');
  
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
        🔍 MINIMAL DEBUG
      </Text>
      <Text style={{
        color: '#4A90E2',
        fontSize: 16,
        marginTop: 10
      }}>
        Step 1: Can you see this text?
      </Text>
      <Text style={{
        color: '#8FB7FF',
        fontSize: 14,
        marginTop: 5
      }}>
        If yes, React Native Web is working
      </Text>
    </View>
  );
}
