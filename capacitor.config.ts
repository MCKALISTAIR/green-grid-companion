import type { CapacitorConfig } from '@capacitor/cli';

const appId = process.env.CAPACITOR_APP_ID || 'app.lovable.1558020f8a4c43dc9ea079533f5d485c';
const appUrl = process.env.VITE_APP_URL || 'https://gridsense-app.lovable.app';
const appHost = appUrl.replace(/^https?:\/\//, '').split('/')[0];

const config: CapacitorConfig = {
  appId: appId,
  appName: 'GridSense',
  webDir: 'dist',
  server: {
    allowNavigation: [appHost],
  },
  /* 
  // Server configuration removed for local bundled mode
  */
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'GridSense',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      // Matches the LaunchBackground colour asset (light). Dark mode uses the asset's dark variant via the storyboard (BH-52).
      backgroundColor: '#f1f7f9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {},
    SignInWithApple: {
      clientId: `${appId}.web`,
      redirectURI: `${appUrl}/auth/callback`,
      scopes: 'email name',
    },
  },
};

export default config;
