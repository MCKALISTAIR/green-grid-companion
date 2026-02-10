// Type declarations for capacitor-native-settings
// This package doesn't have official TypeScript definitions
declare module 'capacitor-native-settings' {
    export enum IOSSettings {
        App = 'app',
        About = 'About',
        Accessibility = 'Accessibility',
        AccountSettings = 'Account',
        // Add more as needed
    }

    export enum AndroidSettings {
        AppNotification = 'APP_NOTIFICATION',
        Application = 'APPLICATION_DETAILS_SETTINGS',
        // Add more as needed
    }

    export interface OpenSettingsOptions {
        optionAndroid?: AndroidSettings;
        optionIOS?: IOSSettings;
    }

    export const NativeSettings: {
        open: (options: OpenSettingsOptions) => Promise<void>;
    };
}
