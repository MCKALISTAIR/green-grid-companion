import Foundation
import Capacitor
import WidgetKit

/// Writes the user's selected Carbon Intensity region into the App Group
/// UserDefaults so the GridSense widget can show regional data.
///
/// Capacitor 6+ no longer auto-discovers plugins declared with the
/// Objective-C `CAP_PLUGIN` macro inside the app target, so this plugin
/// conforms to `CAPBridgedPlugin` and is registered explicitly in
/// `MainViewController.capacitorDidLoad()`.
@objc(SharedPrefsPlugin)
public class SharedPrefsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharedPrefsPlugin"
    public let jsName = "SharedPrefs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setRegion", returnType: CAPPluginReturnPromise)
    ]

    @objc func setRegion(_ call: CAPPluginCall) {
        guard let regionId = call.getString("regionId") else {
            call.reject("Must provide regionId")
            return
        }

        guard let suiteName = AppGroup.identifier,
              let userDefaults = UserDefaults(suiteName: suiteName) else {
            // The App Group is missing from Info.plist or not provisioned.
            print("SharedPrefsPlugin: could not open App Group UserDefaults")
            call.reject("Could not access App Group UserDefaults")
            return
        }

        userDefaults.set(regionId, forKey: AppGroup.selectedRegionKey)

        // Ask WidgetKit to refresh so the widget picks up the new region now.
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve([
            "success": true,
            "regionId": regionId
        ])
    }
}

/// Single source of truth for the App Group shared with the widget.
/// The identifier comes from the `GSAppGroupIdentifier` Info.plist key,
/// which Xcode fills from the `GS_APP_GROUP_ID` build setting.
enum AppGroup {
    static let selectedRegionKey = "selected_region_id"

    static var identifier: String? {
        let value = Bundle.main.object(forInfoDictionaryKey: "GSAppGroupIdentifier") as? String
        guard let value, !value.isEmpty else { return nil }
        return value
    }
}
