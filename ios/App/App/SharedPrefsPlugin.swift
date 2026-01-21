import Foundation
import Capacitor

@objc(SharedPrefsPlugin)
public class SharedPrefsPlugin: CAPPlugin {
    
    // Hardcoded for now based on appId. In a real scenario, this should match the entitlements.
    private let suiteName = "group.app.lovable.1558020f8a4c43dc9ea079533f5d485c"

    @objc func setRegion(_ call: CAPPluginCall) {
        guard let regionId = call.getString("regionId") else {
            call.reject("Must provide regionId")
            return
        }
        
        guard let userDefaults = UserDefaults(suiteName: suiteName) else {
            // If the App Group is not valid/provisioned, this will fail.
            // We'll fall back to standard user defaults just in case, but warn.
            print("SharedPrefsPlugin: Could not load UserDefaults with suiteName \(suiteName)")
            call.reject("Could not access App Group UserDefaults")
            return
        }
        
        userDefaults.set(regionId, forKey: "selected_region_id")
        userDefaults.synchronize() // Force write
        
        call.resolve([
            "success": true,
            "regionId": regionId
        ])
    }
}
