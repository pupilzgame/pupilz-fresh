import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useFullScreenPWA = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // NUCLEAR-LEVEL Telegram WebApp anti-minimization
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      // Initial expansion
      tg.expand();
      tg.enableClosingConfirmation();
      
      // Disable ALL swipe gestures that could minimize
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
      
      // Lock the WebApp in expanded state with aggressive monitoring
      const keepExpanded = () => {
        tg.expand();
        tg.enableClosingConfirmation();
        if (tg.disableVerticalSwipes) {
          tg.disableVerticalSwipes();
        }
      };
      
      // Multiple event listeners to prevent minimize
      tg.onEvent('viewportChanged', keepExpanded);
      tg.onEvent('themeChanged', keepExpanded);
      tg.onEvent('backButtonClicked', (e: any) => {
        e.preventDefault();
        keepExpanded();
        return false;
      });
      
      // Aggressive re-expansion every 500ms
      const expandInterval = setInterval(keepExpanded, 500);
      
      // Prevent window events that could trigger minimize
      const preventMinimize = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        keepExpanded();
        return false;
      };
      
      // Block events that could cause minimization
      window.addEventListener('blur', preventMinimize, true);
      window.addEventListener('focusout', preventMinimize, true);
      window.addEventListener('pagehide', preventMinimize, true);
      window.addEventListener('beforeunload', preventMinimize, true);
      
      // Prevent any scrolling that could trigger minimize
      document.addEventListener('scroll', preventMinimize, true);
      document.addEventListener('touchmove', (e) => {
        // Only prevent if it's a vertical scroll that could minimize
        if (Math.abs(e.touches[0].clientY - (e.touches[0] as any).startY) > 10) {
          preventMinimize(e);
        }
      }, true);
      
      // Override Telegram's internal minimize triggers
      if (tg.MainButton) {
        tg.MainButton.hide();
      }
      if (tg.BackButton) {
        tg.BackButton.hide();
      }
      
      // Set theme colors and maintain focus
      tg.setHeaderColor('#060913');
      tg.setBackgroundColor('#060913');
      
      // Keep window focused
      const maintainFocus = () => {
        window.focus();
        keepExpanded();
      };
      
      setInterval(maintainFocus, 1000);
      
      // Store cleanup function
      (window as any).__telegramCleanup = () => {
        clearInterval(expandInterval);
        window.removeEventListener('blur', preventMinimize, true);
        window.removeEventListener('focusout', preventMinimize, true);
        window.removeEventListener('pagehide', preventMinimize, true);
        window.removeEventListener('beforeunload', preventMinimize, true);
        document.removeEventListener('scroll', preventMinimize, true);
      };
    }

    // Screen orientation lock for PWA
    const lockOrientation = () => {
      if (screen && (screen as any).orientation && (screen as any).orientation.lock) {
        (screen as any).orientation.lock('portrait').catch(() => {
          // Orientation lock not supported or failed
        });
      }
    };

    // EXTREME touch event prevention for Telegram
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      const lastTouch = (preventDoubleTap as any).lastTouch || 0;
      if (now - lastTouch <= 300) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      (preventDoubleTap as any).lastTouch = now;
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Prevent any drag gestures that could trigger minimize
    const preventDrag = (e: TouchEvent | DragEvent) => {
      // If it's a vertical drag, prevent it completely
      if (e.type === 'touchmove' && (e as TouchEvent).touches.length === 1) {
        const touch = (e as TouchEvent).touches[0];
        const startY = (touch as any).startY || touch.clientY;
        const deltaY = touch.clientY - startY;
        
        // Prevent any significant vertical movement
        if (Math.abs(deltaY) > 5) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        (touch as any).startY = touch.clientY;
      } else {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      return false;
    };

    // Add EXTREME event listeners for Telegram
    document.addEventListener('touchstart', preventZoom, { passive: false, capture: true });
    document.addEventListener('touchend', preventDoubleTap, { passive: false, capture: true });
    document.addEventListener('touchmove', preventDrag, { passive: false, capture: true });
    document.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
    document.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
    document.addEventListener('gestureend', preventGesture, { passive: false, capture: true });
    document.addEventListener('dragstart', preventGesture, { passive: false, capture: true });
    document.addEventListener('drag', preventGesture, { passive: false, capture: true });
    document.addEventListener('dragend', preventGesture, { passive: false, capture: true });

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
      // Call Telegram cleanup if it exists
      if ((window as any).__telegramCleanup) {
        (window as any).__telegramCleanup();
      }
      
      document.removeEventListener('touchstart', preventZoom, true);
      document.removeEventListener('touchend', preventDoubleTap, true);
      document.removeEventListener('touchmove', preventDrag, true);
      document.removeEventListener('gesturestart', preventGesture, true);
      document.removeEventListener('gesturechange', preventGesture, true);
      document.removeEventListener('gestureend', preventGesture, true);
      document.removeEventListener('dragstart', preventGesture, true);
      document.removeEventListener('drag', preventGesture, true);
      document.removeEventListener('dragend', preventGesture, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
};