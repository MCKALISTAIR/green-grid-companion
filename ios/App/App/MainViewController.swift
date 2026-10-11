import UIKit
import Capacitor

/// Bridge view controller used by Main.storyboard.
/// Registers plugins that live in the app target (not in an npm package).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SharedPrefsPlugin())
    }
}
