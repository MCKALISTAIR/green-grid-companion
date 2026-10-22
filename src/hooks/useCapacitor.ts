import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { logger } from '@/lib/logger';

export function useCapacitor() {
  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // On iOS, make status bar overlay the webview for edge-to-edge design
          if (Capacitor.getPlatform() === 'ios') {
            await StatusBar.setOverlaysWebView({ overlay: true });
            // No web-style prev/next/done bar above the keyboard (BH-54).
            await Keyboard.setAccessoryBarVisible({ isVisible: false });
          }

          // Configure status bar style
          await StatusBar.setStyle({ style: Style.Light });

          // Hide splash screen once app is ready
          await SplashScreen.hide();
        } catch (error) {
          logger.debug('Capacitor initialization failed', { error });
        }
      }
    };

    initCapacitor();
  }, []);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}
