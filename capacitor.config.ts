import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1558020f8a4c43dc9ea079533f5d485c',
  appName: 'GridSense',
  webDir: 'dist',
  server: {
    url: 'https://1558020f-8a4c-43dc-9ea0-79533f5d485c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'GridSense'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;
