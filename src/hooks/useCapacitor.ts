import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export function useCapacitor() {
  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Configure status bar for iOS
          await StatusBar.setStyle({ style: Style.Light });
          
          // On iOS, make status bar overlay the webview for edge-to-edge design
          if (Capacitor.getPlatform() === 'ios') {
            await StatusBar.setOverlaysWebView({ overlay: true });
          }
          
          // Hide splash screen once app is ready
          await SplashScreen.hide();
        } catch (error) {
          console.log('Capacitor init error:', error);
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
