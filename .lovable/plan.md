

## Fix Google/Apple Sign-In for iOS Native App (and Localhost)

### Problem Analysis

The OAuth flow has different behavior depending on platform, and the iOS native flow has a fundamental gap:

**iOS Native (broken):**
1. User taps Sign In
2. The Capacitor WebView navigates to the broker at `gridsense-app.lovable.app/~oauth/initiate`
3. Broker redirects to Google/Apple
4. After authentication, the broker needs to redirect back with tokens
5. The redirect goes to `GridSense://auth/callback` -- this opens the app via deep link
6. BUT: the tokens from the broker are lost because the WebView navigated away entirely, and the `AuthCallback` page only checks for an existing session (which was never set)

**Localhost (partially broken):**
1. The Vite proxy correctly forwards `/~oauth` to the broker
2. But `redirect_uri` is `http://localhost:8080` which may be rejected as non-HTTPS
3. When not in an iframe, it does a full redirect which loses the page context

### Solution

#### 1. Fix iOS Native: Extract tokens from the deep link URL

The broker appends tokens as URL hash fragments or query parameters when redirecting back to `GridSense://auth/callback`. The `AuthCallback` page and `DeepLinkHandler` need to extract these tokens and call `supabase.auth.setSession()`.

**Changes to `src/pages/AuthCallback.tsx`:**
- Parse `access_token` and `refresh_token` from the URL hash fragment (or query params)
- If tokens are present, call `supabase.auth.setSession({ access_token, refresh_token })`
- If no tokens, fall back to the existing `getSession()` check

**Changes to `src/components/DeepLinkHandler.tsx`:**
- When handling a `GridSense://auth/callback` deep link, pass along the full URL including hash/query params so `AuthCallback` can extract tokens

#### 2. Fix iOS Native: Add Google Reversed Client ID to Info.plist

Google Sign-In on iOS requires the Google Reversed Client ID as a URL scheme. This is already documented in your project memory but not yet in the Info.plist.

**Changes to `ios/App/App/Info.plist`:**
- Add a second `CFBundleURLTypes` entry with scheme `com.googleusercontent.apps.818569205239-ap8ptjsmhgtknlu5pclvaukkr5mb5eai`

#### 3. Improve Localhost: Use preview URL as fallback

Since the broker may reject `http://localhost:8080`, when running on localhost the `redirect_uri` should fall back to the preview URL, or the flow should open the broker in a popup window instead of a full redirect.

**Changes to `src/components/AccountBackup.tsx`:**
- Detect localhost and use the preview URL as `redirect_uri` instead, OR
- Force the iframe/popup flow for localhost by opening the broker URL in a new window

### Technical Details

```text
iOS Native Flow (after fix):
  App -> Broker (full redirect in WebView)
      -> Google/Apple OAuth
      -> Broker receives tokens
      -> Broker redirects to GridSense://auth/callback#access_token=...&refresh_token=...
      -> iOS intercepts custom scheme, fires appUrlOpen
      -> DeepLinkHandler passes URL to AuthCallback
      -> AuthCallback extracts tokens, calls setSession()
      -> User is authenticated

Localhost Flow (after fix):
  Browser -> /~oauth/initiate (Vite proxied to broker)
          -> Opens popup for OAuth
          -> Popup completes, posts tokens via postMessage
          -> Tokens received, setSession() called
          -> User is authenticated
```

### Files to Modify

1. **`src/pages/AuthCallback.tsx`** -- Parse tokens from URL hash/query and call `setSession()`
2. **`src/components/DeepLinkHandler.tsx`** -- Forward full URL (including hash) when navigating to `/auth/callback`
3. **`ios/App/App/Info.plist`** -- Add Google Reversed Client ID URL scheme
4. **`src/components/AccountBackup.tsx`** -- Handle localhost redirect URI gracefully

### After Implementation

You will need to:
- `git pull` and run `npx cap sync` to update the iOS project with the new Info.plist changes
- Rebuild and test on the iOS device

