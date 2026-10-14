# iOS Deployment Guide for Green Grid Companion

This guide outlines the steps to package your current web application as an iOS app and deploy it to a physical device for testing.

For **TestFlight / App Store Connect uploads** (paid Apple Developer team, widget + entitlements), see `docs/ios-testflight.md`.

## Prerequisites

1.  **Xcode**: Ensure you have Xcode installed from the Mac App Store.
2.  **Apple Developer Account**: You need at least a free Apple ID to sign the app for personal use.

## Step 1: Configuration Check

Your project uses Capacitor to bridge the web app to native iOS.

### Important: Dev vs. Bundled Mode

Currently, your `capacitor.config.ts` might be configured to load a remote URL (likely from Lovable).

**To test your LOCALLY running code on the device, you have two options:**

#### Option A: Bundled Mode (Recommended for simple testing)
This packs your built web assets into the app itself. It works offline and is closest to a production release.

1.  Open `capacitor.config.ts`.
2.  **Remove or comment out** the entire `server` block:
    ```typescript
    /*
    server: {
      url: '...',
      cleartext: true
    },
    */
    ```
3.  Ensure `webDir` is set to `'dist'`.

#### Option B: Live Reload (Best for active development)
This makes the app load from your computer's local server, allowing instant updates when you save files.

1.  Ensure your computer and iPhone are on the **same Wi-Fi network**.
2.  Find your computer's local IP address (e.g., `192.168.1.5`).
3.  Update `capacitor.config.ts`:
    ```typescript
    server: {
      url: 'http://192.168.1.5:8080', // Replace with your actual IP
      cleartext: true
    },
    ```

## Step 2: Build the Web App

Before syncing to iOS, you must build the latest version of your web application.

```bash
npm run build
```

*Note: If using Option B (Live Reload), you can skip this step after the initial setup, but the dev server must be running (`npm run dev -- --host`).*

## Step 3: Sync to iOS

Update the native iOS project with your latest built assets and plugins.

```bash
npx cap sync ios
```

## Step 4: Open in Xcode

Launch the native project in Xcode.

```bash
npx cap open ios
```

## Step 5: Configure Signing (First Time Only)

1.  In Xcode, click on the **App** project root in the left file navigator (usually named "App").
2.  Select the **App** target in the main view.
3.  Go to the **Signing & Capabilities** tab.
4.  Under **Team**, select your Apple ID (Personal Team).
    *   *If none are listed, click "Add an Account..." and log in with your Apple ID.*
5.  Ensure "Automatically manage signing" is checked.
6.  You may need to change the **Bundle Identifier** if the current one is taken or invalid (e.g., change `app.lovable...` to `com.yourname.projectname`).

## Step 6: Run on Device

1.  Connect your iPhone to your Mac via USB.
2.  Unlock your iPhone and click "Trust" if prompted on either device.
3.  In Xcode's top toolbar, select your **iPhone** from the device list (to the immediate right of the "App" scheme).
4.  Click the **Play** button (Run) or press `Cmd + R`.

## Step 7: Troubleshooting

*   **"Untrusted Developer" Error**: On your iPhone, go to **Settings > General > VPN & Device Management**, tap your Apple ID, and tap "Trust".
*   **White Screen**: If using Live Reload, ensure your phone can reach your computer's IP. Try opening Safari on the phone and visiting `http://<your-ip>:8080`.
