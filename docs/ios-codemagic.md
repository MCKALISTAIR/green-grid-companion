# GridSense iOS: build path (Codemagic → TestFlight)

No Mac is needed. Codemagic builds and signs the app on its own Macs and
uploads it to App Store Connect, where it appears in TestFlight for internal
testers. CI never submits for App Review or external beta review.

## What's in the Xcode project

| Item | Where |
|---|---|
| App target `App` | `ios/App/App.xcodeproj` (Capacitor 7, Swift Package Manager) |
| Widget target `GridSenseWidgetExtension` (WidgetKit, small + medium) | `ios/App/GridSenseWidget/` embedded in the app |
| Widget region bridge (`SharedPrefs` JS plugin) | `ios/App/App/SharedPrefsPlugin.swift`, registered in `MainViewController.swift` |
| App entitlements: Push (`aps-environment`), Sign in with Apple, App Group | `ios/App/App/App.entitlements` |
| Widget entitlements: App Group | `ios/App/GridSenseWidget/GridSenseWidget.entitlements` |
| Privacy manifests | `ios/App/App/PrivacyInfo.xcprivacy`, `ios/App/GridSenseWidget/PrivacyInfo.xcprivacy` |
| Shared scheme `App` (CI needs a shared scheme) | `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` |
| CI pipeline | `codemagic.yaml` (workflow `ios-testflight`) |

## Identifiers (placeholders until confirmed)

| Setting | Value now | Change in |
|---|---|---|
| Apple Team ID | `UW7848QP79` (already in the project; confirm it is your team) | `project.pbxproj` `DEVELOPMENT_TEAM` (Codemagic overrides from the profile) |
| App bundle ID | `com.greengrid.companion` | `project.pbxproj` (App target) + `codemagic.yaml` `BUNDLE_ID` |
| Widget bundle ID | `com.greengrid.companion.widget` | `project.pbxproj` (widget target) + `codemagic.yaml` `WIDGET_BUNDLE_ID` |
| App Group | `group.com.greengrid.companion` | `project.pbxproj` project-level `GS_APP_GROUP_ID` (entitlements and both Info.plists read it) |
| Codemagic API key name | `GridSense ASC key` | `codemagic.yaml` `integrations.app_store_connect` |

Bundle IDs are permanent once the app is on the App Store, so decide before the
first upload. `capacitor.config.ts` still defaults `appId` to the Lovable id
`app.lovable.1558020f…`; that value is not used for the iOS bundle ID (Xcode's
`PRODUCT_BUNDLE_IDENTIFIER` is), but it is used for the Sign in with Apple web
Services ID (`<appId>.web`). Align it when the final ID is chosen.

## One-time setup (Alistair, all in a browser)

1. **Apple Developer Program**: enrol (or sign in) at developer.apple.com, finish 2FA, accept the latest Program License Agreement. In App Store Connect > Business, accept the Free Apps agreement.
2. **Identifiers** (developer.apple.com > Certificates, Identifiers & Profiles):
   - App Group `group.com.greengrid.companion`.
   - App ID `com.greengrid.companion` with **App Groups** (assign the group), **Push Notifications**, **Sign in with Apple**.
   - App ID `com.greengrid.companion.widget` with **App Groups** (same group).
3. **APNs key** (Keys > +, Apple Push Notifications service) for the Supabase `push-subscriptions`/notification functions (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`). Not needed for the build itself.
4. **App Store Connect app record**: My Apps > + > New App, platform iOS, name GridSense, bundle ID `com.greengrid.companion`, SKU of your choice. Note the numeric Apple ID (App Information) for `APP_STORE_APPLE_ID`.
5. **App Store Connect API key**: Users and Access > Integrations > App Store Connect API > +, access **App Manager**. Download the `.p8` (one chance only) and note the Key ID and Issuer ID.
6. **Distribution certificate key**: create an RSA key on any computer (Windows PowerShell and Linux both have `ssh-keygen`):
   `ssh-keygen -t rsa -b 2048 -m PEM -f ios_distribution_private_key -q -N ""`
   Codemagic uses it to create the iOS Distribution certificate on the first build.
7. **Codemagic**: sign up with GitHub, add the `green-grid-companion` repo, then:
   - Team settings > Integrations > Developer Portal: add the API key from step 5 and name it `GridSense ASC key`.
   - App > Environment variables: group `ios_signing` with `CERTIFICATE_PRIVATE_KEY` (secret, full contents of the key from step 6).
   - Optional group `gridsense_web`: `VITE_SENTRY_DSN` (secret), `APP_STORE_APPLE_ID`.
8. Start the `iOS → TestFlight (internal)` workflow manually. When the build finishes processing, add yourself as an internal tester in TestFlight.

## Privacy manifest: what's declared and why

Tracking: **No**. No tracking domains.

Required-reason APIs (our own code only; Capacitor, Sentry and the plugins ship
their own manifests):

- `UserDefaults` → `1C8F.1` (App Group shared between app and widget). App and widget.

Collected data (app manifest; the widget collects nothing):

| Data type | Linked | Purpose | Source in code |
|---|---|---|---|
| Email address | Yes | App functionality | Google / Apple sign-in (Supabase auth) |
| Name | Yes | App functionality | Apple sign-in `name` scope, Google profile |
| User ID | Yes | App functionality | Supabase user id (anonymous sessions too) |
| Device ID | Yes | App functionality | APNs device token in `push_subscriptions` |
| Coarse location | Yes | App functionality | postcode / region in `push_subscriptions`, preferences |
| Other data types | Yes | App functionality | Octopus account, meter and consumption data; Tesla energy data (feature-flagged) |
| Crash data | No | App functionality | Sentry error reports (when DSN set) |
| Performance data | No | App functionality | Sentry tracing, 10% sample |
| Product interaction | No | App functionality | Sentry Session Replay (10% of sessions, 100% on error) |

Judgement calls to review against the final privacy policy and App Store
privacy labels:

- **Precise location** is not declared. Device coordinates are sent in real time
  to postcodes.io (and Nominatim as fallback) to find the region and are not
  stored by GridSense. If that changes, declare Precise Location.
- If Session Replay is turned off or gated behind consent, Product Interaction
  can be removed. If Sentry is tied to the signed-in user, flip the Sentry rows
  to Linked = Yes.
- Lovable's hosted analytics script only runs on the hosted website, not in the
  bundled iOS app.

## Not verified (needs a Mac / Codemagic run)

Nothing here has been compiled. The project file, plists, privacy manifests,
storyboard and scheme were checked for structure on Linux, and the web build
plus `cap sync ios` were run successfully. The first Codemagic run is the real
compile and signing test.
