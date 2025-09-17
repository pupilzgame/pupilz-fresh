import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SceneRouter from './src/SceneRouter';
import { useFullScreenPWA } from './useFullScreenPWA';
import './global.css';

export default function App() {
  // PWA and Telegram WebApp integration
  useFullScreenPWA();

  return (
    <SafeAreaProvider>
      <SceneRouter />
    </SafeAreaProvider>
  );
}