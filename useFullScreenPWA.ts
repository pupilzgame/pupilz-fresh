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
      
      // ULTRA-AGGRESSIVE re-expansion every 100ms 
      const expandInterval = setInterval(keepExpanded, 100);
      
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
      
      // Block ALL scrolling that could trigger minimize
      document.addEventListener('scroll', preventMinimize, true);
      document.addEventListener('touchmove', (e) => {
        // Block any vertical movement that could trigger minimize
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const deltaY = Math.abs(touch.clientY - ((touch as any).startY || touch.clientY));
          if (deltaY > 20) {
            preventMinimize(e);
          }
          (touch as any).startY = touch.clientY;
        }
      }, true);
      
      // Block overscroll and pull-to-refresh
      document.addEventListener('overscroll', preventMinimize, true);
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          (e.touches[0] as any).startY = e.touches[0].clientY;
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
      
      setInterval(maintainFocus, 200);
      
      // EXTREME: Override ALL Telegram minimize methods
      if ((window as any).Telegram?.WebApp) {
        const tgApp = (window as any).Telegram.WebApp;
        
        // Override minimize method
        if (tgApp.minimize) {
          tgApp.minimize = () => {
            console.log('WebApp.minimize() blocked!');
            keepExpanded();
            return false;
          };
        }
        
        // Override close method
        if (tgApp.close) {
          tgApp.close = () => {
            console.log('WebApp.close() blocked!');
            keepExpanded();
            return false;
          };
        }
        
        // Override any sendData that might trigger minimize
        const originalSendData = tgApp.sendData;
        if (originalSendData) {
          tgApp.sendData = (data: any) => {
            console.log('WebApp.sendData() intercepted:', data);
            keepExpanded();
            // Still allow sending data, just ensure we stay expanded
            return originalSendData.call(tgApp, data);
          };
        }
        
        // Block ready event from triggering minimize
        const originalReady = tgApp.ready;
        if (originalReady) {
          tgApp.ready = () => {
            keepExpanded();
            return originalReady.call(tgApp);
          };
        }
      }
      
      // Block ALL navigation events that could minimize
      window.addEventListener('popstate', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        keepExpanded();
        return false;
      });
      
      window.addEventListener('hashchange', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        keepExpanded();
        return false;
      });
      
      // Block Telegram-specific events that might minimize
      window.addEventListener('message', (e) => {
        if (e.data && typeof e.data === 'string') {
          // Block any messages that might be minimize commands
          if (e.data.includes('minimize') || e.data.includes('close') || e.data.includes('hide')) {
            console.log('Blocked minimize message:', e.data);
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            keepExpanded();
            return false;
          }
        }
      });
      
      // Override window.close
      window.close = () => {
        console.log('window.close() blocked!');
        keepExpanded();
        return false;
      };
      
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

    // Smart drag prevention - only block minimize gestures, allow gameplay
    const smartTouchHandler = (e: TouchEvent) => {
      // Allow touches inside the game area
      const gameElement = document.getElementById('game');
      if (gameElement && e.target && gameElement.contains(e.target as Node)) {
        // This is a gameplay touch - allow it
        return true;
      }
      
      // If it's outside game area or a swipe from edge, prevent it
      if (e.type === 'touchmove' && e.touches.length === 1) {
        const touch = e.touches[0];
        
        // Block edge swipes (within 50px of screen edge)
        if (touch.clientX < 50 || touch.clientX > window.innerWidth - 50 ||
            touch.clientY < 50 || touch.clientY > window.innerHeight - 50) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        
        // Block large vertical movements that could be swipe-to-minimize
        const startY = (touch as any).startY || touch.clientY;
        const deltaY = touch.clientY - startY;
        
        if (Math.abs(deltaY) > 100) {  // Increased threshold to allow gameplay
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        (touch as any).startY = touch.clientY;
      }
      return true;
    };

    // Add SMART event listeners for Telegram - allow gameplay, block minimize
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    document.addEventListener('touchmove', smartTouchHandler, { passive: false });
    document.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
    document.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
    document.addEventListener('gestureend', preventGesture, { passive: false, capture: true });
    
    // Only block non-gameplay drags
    document.addEventListener('dragstart', (e) => {
      if (!document.getElementById('game')?.contains(e.target as Node)) {
        preventGesture(e);
      }
    }, { passive: false });
    
    document.addEventListener('drag', (e) => {
      if (!document.getElementById('game')?.contains(e.target as Node)) {
        preventGesture(e);
      }
    }, { passive: false });
    
    document.addEventListener('dragend', (e) => {
      if (!document.getElementById('game')?.contains(e.target as Node)) {
        preventGesture(e);
      }
    }, { passive: false });

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
      
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTap);
      document.removeEventListener('touchmove', smartTouchHandler);
      document.removeEventListener('gesturestart', preventGesture, true);
      document.removeEventListener('gesturechange', preventGesture, true);
      document.removeEventListener('gestureend', preventGesture, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
};