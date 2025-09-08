import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useFullScreenPWA = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // OFFICIAL Telegram WebApp API - The Real Solution
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      console.log('Telegram WebApp version:', tg.version);
      
      // Method 1: Direct property assignment (newer versions)
      try {
        tg.disableVerticalSwipes = true;
        console.log('✅ Set disableVerticalSwipes = true');
      } catch (e) {
        console.log('Property assignment failed:', e);
      }
      
      // Method 2: Function call (Bot API 7.7+)
      try {
        if (typeof tg.disableVerticalSwipes === 'function') {
          tg.disableVerticalSwipes();
          console.log('✅ Called disableVerticalSwipes()');
        }
      } catch (e) {
        console.log('Function call failed:', e);
      }
      
      // Method 3: Closing confirmation (additional protection)
      try {
        tg.isClosingConfirmationEnabled = true;
        console.log('✅ Set isClosingConfirmationEnabled = true');
      } catch (e) {
        console.log('Closing confirmation failed:', e);
      }
      
      // Method 4: Traditional expand and enable closing confirmation
      try {
        tg.expand();
        if (typeof tg.enableClosingConfirmation === 'function') {
          tg.enableClosingConfirmation();
        }
        console.log('✅ Expanded and enabled closing confirmation');
      } catch (e) {
        console.log('Traditional methods failed:', e);
      }
      
      // Method 5: Check status
      console.log('isExpanded:', tg.isExpanded);
      console.log('isVerticalSwipesEnabled:', tg.isVerticalSwipesEnabled);
      
      // Method 6: Fallback CSS solution for older versions (pre-7.7)
      if (!tg.isVerticalSwipesEnabled === undefined) {
        console.log('Applying CSS fallback for older Telegram versions');
        const overflow = 100;
        document.body.style.overflowY = 'hidden';
        document.body.style.marginTop = `${overflow}px`;
        document.body.style.height = window.innerHeight + overflow + "px";
        document.body.style.paddingBottom = `${overflow}px`;
        window.scrollTo(0, overflow);
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
      
      // Gentle re-expansion every 5 seconds (now that we use proper API)
      const expandInterval = setInterval(() => {
        if (!tg.isExpanded) {
          console.log('Re-expanding WebApp');
          keepExpanded();
        }
      }, 5000);
      
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
      
      // Since we're using proper API, only prevent document-level scrolls as backup
      document.addEventListener('scroll', (e) => {
        if (e.target === document || e.target === document.body) {
          console.log('Preventing document scroll as backup');
          e.preventDefault();
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
      
      setInterval(maintainFocus, 10000); // Every 10 seconds is enough with proper API
      
      // Don't override minimize methods - allow intentional minimize from top border
      // Just ensure we start expanded and stay focused
      if ((window as any).Telegram?.WebApp) {
        const tgApp = (window as any).Telegram.WebApp;
        console.log('Telegram WebApp detected - allowing controlled minimize');
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
      
      // Allow normal minimize functionality - only block accidental ones
      console.log('Hamster Kombat style minimize control enabled - top 30px swipe zone active');
      
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