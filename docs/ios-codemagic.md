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

Reconciled with the App Store privacy label draft
(`gridsense-legal/app-store-privacy-labels.md`). Keep the two in step.

Tracking: **No**. No tracking domains.

Required-reason APIs (our own code only; Capacitor, Sentry and the plugins ship
their own manifests). Re-check with Xcode's *Generate Privacy Report* after the
first archive:

- `UserDefaults` → `1C8F.1` (App Group shared between app and widget). App and widget.

Collected data (app manifest; the widget collects nothing; it only sends a
public region number to the Carbon Intensity API):

| Data type | Linked | Purposes | Source in code |
|---|---|---|---|
| Email address | Yes | App functionality | Google / Apple sign-in (Supabase auth) |
| Name | Yes | App functionality | Apple `name` scope / Google profile; Supabase auth keeps provider metadata |
| User ID | Yes | App functionality | Supabase user id (anonymous sessions too) |
| Coarse location | Yes | App functionality | postcode in `push_subscriptions`, saved locations in `user_preferences` |
| Precise location | No | App functionality | device coordinates sent to postcodes.io, Nominatim, Open-Meteo and the `weather` edge function (which logs them) |
| Other user content | Yes | App functionality | saved location names, custom appliance/event names |
| Other data types | Yes | App functionality | Octopus account, meter, consumption, dispatch data; household profile |
| Crash data | No | App functionality | Sentry error reports (when DSN set) |
| Performance data | No | Analytics, App functionality | Sentry tracing, 10% sample |
| Other diagnostic data | No | App functionality | Sentry breadcrumbs / logger |
| Product interaction | No | Analytics, App functionality | Sentry Session Replay (10% of sessions, 100% on error) |

Why precise location is declared: Apple counts data as collected when it leaves
the device and can be kept longer than needed to answer the request. The
`weather` function logs `lat, lon` and Open-Meteo keeps request logs with
coordinates, so "not collected" is not defensible today. It is not linked
because the coordinates are not stored against a user ID.

Open items:

- **Name**: no app code persists the name, but Supabase auth stores OAuth
  provider metadata. Declared conservatively; remove only if that metadata is
  stripped.
- **Device ID** was removed (APNs tokens are not Apple's "Device ID"; the
  push row is covered by User ID / Coarse location), matching the label draft.
- **Product interaction / performance data**: drop if Sentry Session Replay or
  tracing is removed or gated off; flip to Linked if `Sentry.setUser` is ever added.
- **Tesla** is feature-flagged off and not declared. Add it to Other data types
  (and re-review location) if it is enabled.
- Lovable's hosted analytics script only runs on the hosted website, not in the
  bundled iOS app.

## Not verified (needs a Mac / Codemagic run)

Nothing here has been compiled. The project file, plists, privacy manifests,
storyboard and scheme were checked for structure on Linux, and the web build
plus `cap sync ios` were run successfully. The first Codemagic run is the real
compile and signing test.
