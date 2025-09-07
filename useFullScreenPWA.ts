import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useFullScreenPWA = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Telegram WebApp integration
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      // Expand and configure Telegram WebApp
      tg.expand();
      tg.enableClosingConfirmation();
      
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
      
      // Re-expand on viewport changes
      tg.onEvent('viewportChanged', () => {
        tg.expand();
      });
      
      // Set theme colors
      tg.setHeaderColor('#060913');
      tg.setBackgroundColor('#060913');
    }

    // Screen orientation lock for PWA
    const lockOrientation = () => {
      if (screen && (screen as any).orientation && (screen as any).orientation.lock) {
        (screen as any).orientation.lock('portrait').catch(() => {
          // Orientation lock not supported or failed
        });
      }
    };

    // Prevent iOS zoom and gestures
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      const lastTouch = (preventDoubleTap as any).lastTouch || 0;
      if (now - lastTouch <= 300) {
        e.preventDefault();
      }
      (preventDoubleTap as any).lastTouch = now;
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    // Add event listeners
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('gestureend', preventGesture, { passive: false });

    // Handle window resize for game canvas
    const handleResize = () => {
      // Dispatch custom event for game to handle resize
      window.dispatchEvent(new Event('game-resize'));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
      lockOrientation();
    });

    // Initial orientation lock
    lockOrientation();

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTap);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
};