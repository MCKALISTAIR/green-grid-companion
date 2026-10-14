# GridSense iOS: local Mac → TestFlight

Build and sign on a Mac with Xcode, then upload to App Store Connect for
internal TestFlight. No Codemagic (or other CI Mac farm) is used.

For day-to-day device runs without TestFlight, see `docs/ios_deployment_guide.md`.

## What's in the Xcode project

| Item                                                                      | Where                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| App target `App`                                                          | `ios/App/App.xcodeproj` (Capacitor 7, Swift Package Manager)                         |
| Widget target `GridSenseWidgetExtension` (WidgetKit, small + medium)      | `ios/App/GridSenseWidget/` embedded in the app                                       |
| Widget region bridge (`SharedPrefs` JS plugin)                            | `ios/App/App/SharedPrefsPlugin.swift`, registered in `MainViewController.swift`      |
| App entitlements: Push (`aps-environment`), Sign in with Apple, App Group | `ios/App/App/App.entitlements`                                                       |
| Widget entitlements: App Group                                            | `ios/App/GridSenseWidget/GridSenseWidget.entitlements`                               |
| Privacy manifests                                                         | `ios/App/App/PrivacyInfo.xcprivacy`, `ios/App/GridSenseWidget/PrivacyInfo.xcprivacy` |
| Shared scheme `App`                                                       | `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`                          |

## Identifiers (confirm before first upload)

| Setting          | Value now                                                      | Change in                                                                                     |
| ---------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Apple Team ID    | `UW7848QP79` (already in the project; confirm it is your team) | Xcode Signing & Capabilities, or `project.pbxproj` `DEVELOPMENT_TEAM`                         |
| App bundle ID    | `com.greengrid.companion`                                      | `project.pbxproj` (App target)                                                                |
| Widget bundle ID | `com.greengrid.companion.widget`                               | `project.pbxproj` (widget target)                                                             |
| App Group        | `group.com.greengrid.companion`                                | `project.pbxproj` project-level `GS_APP_GROUP_ID` (entitlements and both Info.plists read it) |

Bundle IDs are permanent once the app is on the App Store, so decide before the
first upload. `capacitor.config.ts` still defaults `appId` to the Lovable id
`app.lovable.1558020f…`; that value is not used for the iOS bundle ID (Xcode's
`PRODUCT_BUNDLE_IDENTIFIER` is), but it is used for the Sign in with Apple web
Services ID (`<appId>.web`). Align it when the final ID is chosen.

`Info.plist` sets `ITSAppUsesNonExemptEncryption = false` (HTTPS only). Confirm
that remains true before App Store Connect export compliance questions.

## One-time Apple setup (browser)

1. **Apple Developer Program**: enrol (or sign in) at developer.apple.com, finish 2FA, accept the latest Program License Agreement. In App Store Connect > Business, accept the Free Apps agreement.
2. **Identifiers** (developer.apple.com > Certificates, Identifiers & Profiles):
   - App Group `group.com.greengrid.companion`.
   - App ID `com.greengrid.companion` with **App Groups** (assign the group), **Push Notifications**, **Sign in with Apple**.
   - App ID `com.greengrid.companion.widget` with **App Groups** (same group).
3. **APNs key** (Keys > +, Apple Push Notifications service) for the Supabase push functions (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`). Not needed for the first archive/upload.
4. **App Store Connect app record**: My Apps > + > New App, platform iOS, name GridSense, bundle ID `com.greengrid.companion`, SKU of your choice.

Xcode's "Automatically manage signing" will create the Distribution certificate and
provisioning profiles for the app + widget on first Archive when you are signed
into the correct team.

## Every release (on a Mac)

Use Bun (same as CI): `package-lock.json` is stale; `npm ci` fails.

```bash
# From the repo root
bun install --frozen-lockfile
export VITE_APP_VERSION="$(node -p "require('./package.json').version")"
bun run build
bunx cap sync ios
bunx cap open ios
```

In Xcode:

1. Select the **App** scheme and **Any iOS Device (arm64)** (not a simulator).
2. **Signing & Capabilities** on both **App** and **GridSenseWidgetExtension**:
   - Team = your paid Apple Developer team.
   - Automatically manage signing = on.
   - Confirm bundle IDs and App Group match the table above.
3. Bump **Build** (CFBundleVersion) so it is higher than any previous upload. Keep
   the app and widget build numbers the same.
4. **Product → Archive**. When the Organizer opens, **Distribute App → App Store Connect → Upload**.
5. Leave "Submit for review" alone. After processing finishes in App Store Connect,
   add yourself under TestFlight → Internal Testing and install via the TestFlight app.

Optional check after the first archive: **Product → Generate Privacy Report** and
compare with the privacy section below.

## Device-only smoke test (no TestFlight)

Same build/sync/open steps, then run on a connected iPhone with a Development
profile. See `docs/ios_deployment_guide.md` for Trust / white-screen notes.

## Privacy manifest: what's declared and why

Reconciled with the App Store privacy label draft
(`gridsense-legal/app-store-privacy-labels.md`). Keep the two in step.

Tracking: **No**. No tracking domains.

Required-reason APIs (our own code only; Capacitor, Sentry and the plugins ship
their own manifests). Re-check with Xcode's _Generate Privacy Report_ after the
first archive:

- `UserDefaults` → `1C8F.1` (App Group shared between app and widget). App and widget.

Collected data (app manifest; the widget collects nothing; it only sends a
public region number to the Carbon Intensity API):

| Data type             | Linked | Purposes                     | Source in code                                                                                                   |
| --------------------- | ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Email address         | Yes    | App functionality            | Google / Apple sign-in (Supabase auth)                                                                           |
| Name                  | Yes    | App functionality            | Apple `name` scope / Google profile; Supabase auth keeps provider metadata                                       |
| User ID               | Yes    | App functionality            | Supabase user id (anonymous sessions too)                                                                        |
| Coarse location       | Yes    | App functionality            | postcode in `push_subscriptions`, saved locations in `user_preferences`                                          |
| Precise location      | No     | App functionality            | device coordinates sent to postcodes.io, Nominatim, Open-Meteo and the `weather` edge function (which logs them) |
| Other user content    | Yes    | App functionality            | saved location names, custom appliance/event names                                                               |
| Other data types      | Yes    | App functionality            | Octopus account, meter, consumption, dispatch data; household profile                                            |
| Crash data            | No     | App functionality            | Sentry error reports (when DSN set)                                                                              |
| Performance data      | No     | Analytics, App functionality | Sentry tracing, 10% sample                                                                                       |
| Other diagnostic data | No     | App functionality            | Sentry breadcrumbs / logger                                                                                      |
| Product interaction   | No     | Analytics, App functionality | Sentry Session Replay (10% of sessions, 100% on error)                                                           |

Why precise location is declared: Apple counts data as collected when it leaves
the device and can be kept longer than needed to answer the request. The
`weather` function logs `lat, lon` and Open-Meteo keeps request logs with
coordinates, so "not collected" is not defensible today. It is not linked
because the coordinates are not stored against a user ID. On-device coordinate
rounding (2 decimal places) reduces precision before external requests; it does
not remove the declaration.

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

## Not verified (needs a Mac)

Nothing here has been compiled on Apple silicon. The project file, plists,
privacy manifests, storyboard and scheme were checked for structure on Linux,
and the web build plus `cap sync ios` were run successfully. The first Xcode
Archive is the real compile and signing test.
