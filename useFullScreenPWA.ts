import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useFullScreenPWA = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // HAMSTER COMBAT STYLE - Telegram WebApp API Implementation
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      console.log('🎮 Initializing Telegram Mini App like Hamster Combat');
      console.log('Telegram WebApp version:', tg.version);
      
      // STEP 1: Call ready() - This is CRITICAL and was missing!
      tg.ready();
      console.log('✅ Called Telegram.WebApp.ready()');
      
      // STEP 2: Expand to full height immediately
      tg.expand();
      console.log('✅ Expanded to full height');
      
      // STEP 3: Disable vertical swipes (the key method for preventing minimize)
      try {
        if (typeof tg.disableVerticalSwipes === 'function') {
          tg.disableVerticalSwipes();
          console.log('✅ Called disableVerticalSwipes() function');
        } else {
          // Fallback for older versions
          tg.disableVerticalSwipes = true;
          console.log('✅ Set disableVerticalSwipes property');
        }
      } catch (e) {
        console.log('❌ disableVerticalSwipes failed:', e);
      }
      
      // STEP 4: Enable closing confirmation for extra protection
      try {
        if (typeof tg.enableClosingConfirmation === 'function') {
          tg.enableClosingConfirmation();
          console.log('✅ Enabled closing confirmation');
        }
      } catch (e) {
        console.log('❌ enableClosingConfirmation failed:', e);
      }
      
      // STEP 5: Set theme colors to match your game
      tg.setHeaderColor('#060913');
      tg.setBackgroundColor('#060913');
      console.log('✅ Set theme colors');
      
      // STEP 6: Hide Telegram UI buttons that could interfere
      if (tg.MainButton) {
        tg.MainButton.hide();
        console.log('✅ Hidden MainButton');
      }
      if (tg.BackButton) {
        tg.BackButton.hide();
        console.log('✅ Hidden BackButton');
      }
      
      // STEP 7: Status logging for debugging
      console.log('📊 Final status:');
      console.log('  - isExpanded:', tg.isExpanded);
      console.log('  - isVerticalSwipesEnabled:', tg.isVerticalSwipesEnabled);
      console.log('  - viewportHeight:', tg.viewportHeight);
      console.log('  - viewportStableHeight:', tg.viewportStableHeight);
      
      // STEP 8: Optional - Light monitoring (not aggressive like before)
      const lightMonitoring = setInterval(() => {
        // Only re-expand if we've been collapsed (shouldn't happen with proper API)
        if (!tg.isExpanded) {
          console.log('🔄 Re-expanding (this should rarely happen now)');
          tg.expand();
          if (typeof tg.disableVerticalSwipes === 'function') {
            tg.disableVerticalSwipes();
          }
        }
      }, 10000); // Check every 10 seconds
      
      // STEP 9: Clean event handling - only prevent document-level scrolling
      const preventDocumentScroll = (e: Event) => {
        if (e.target === document || e.target === document.body || 
            e.target === document.documentElement) {
          e.preventDefault();
          console.log('🚫 Prevented document-level scroll');
        }
      };
      
      document.addEventListener('scroll', preventDocumentScroll, { passive: false });
      document.addEventListener('touchmove', preventDocumentScroll, { passive: false });
      
      // Store cleanup function
      (window as any).__telegramCleanup = () => {
        clearInterval(lightMonitoring);
        document.removeEventListener('scroll', preventDocumentScroll);
        document.removeEventListener('touchmove', preventDocumentScroll);
        console.log('🧹 Telegram Mini App cleanup completed');
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

    // SIMPLIFIED touch prevention - Trust Telegram API, minimal backup
    const preventMultiTouch = (e: TouchEvent) => {
      // Only prevent pinch-to-zoom (multi-touch)
      if (e.touches.length > 1) {
        e.preventDefault();
        console.log('🚫 Prevented multi-touch zoom');
      }
    };

    const preventPullToRefresh = (e: TouchEvent) => {
      // Only prevent pull-to-refresh at the very top of the document
      if (e.target === document.body || e.target === document.documentElement) {
        const touch = e.touches[0];
        if (touch.clientY < 50 && window.scrollY === 0) {
          e.preventDefault();
          console.log('🚫 Prevented pull-to-refresh');
        }
      }
    };

    // Minimal touch prevention - let Telegram API do the heavy lifting
    document.addEventListener('touchstart', preventMultiTouch, { passive: false });
    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

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
      
      document.removeEventListener('touchstart', preventMultiTouch);
      document.removeEventListener('touchmove', preventPullToRefresh);
      window.removeEventListener('resize', handleResize);
      
      console.log('🧹 useFullScreenPWA cleanup completed');
    };
  }, []);
};