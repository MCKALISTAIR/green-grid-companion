import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1558020f8a4c43dc9ea079533f5d485c',
  appName: 'GridSense',
  webDir: 'dist',
  /* 
  // Server configuration removed for local bundled mode
  */
  ios: {
    contentInset: 'never',
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
    StatusBar: {},
    SignInWithApple: {
      clientId: 'app.lovable.1558020f8a4c43dc9ea079533f5d485c.web',
      redirectURI: 'https://gridsense-app.lovable.app/auth/callback',
      scopes: 'email name'
    }
  }
};

export default config;
