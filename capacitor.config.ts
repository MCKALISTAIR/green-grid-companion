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
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {},
    // BH-54: resize the body (not the whole WKWebView) when the keyboard opens, so
    // fixed elements like the tab bar don't jump, and the page doesn't scroll behind it.
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SignInWithApple: {
      clientId: `${appId}.web`,
      redirectURI: `${appUrl}/auth/callback`,
      scopes: 'email name',
    },
  },
};

export default config;
