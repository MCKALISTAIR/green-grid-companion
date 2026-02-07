import AppKit
import Foundation

// MARK: - App Delegate
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var timer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Create the status item in the menu bar
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusItem.button {
            button.title = "Grid: ..."
        }

        setupMenu()
        fetchData()

        // Refresh every 10 minutes
        timer = Timer.scheduledTimer(withTimeInterval: 600, repeats: true) { _ in
            self.fetchData()
        }
    }

    func setupMenu(forecast: [ForecastItem] = []) {
        let menu = NSMenu()

        // 1. Current Status
        let statusTitle = "Grid Status: Computing..."
        let statusItem = NSMenuItem(title: statusTitle, action: nil, keyEquivalent: "")
        menu.addItem(statusItem)
        
        menu.addItem(NSMenuItem.separator())

        // 2. Forecast
        if !forecast.isEmpty {
            let forecastHeader = NSMenuItem(title: "Upcoming Forecast:", action: nil, keyEquivalent: "")
            forecastHeader.isEnabled = false
            menu.addItem(forecastHeader)

            // Show next 4 hours (8 slots of 30 mins)
            let limit = min(forecast.count, 8)
            for i in 0..<limit {
                let item = forecast[i]
                let date = ISO8601DateFormatter().date(from: item.from) ?? Date()
                let timeStr = DateFormatter.localizedString(from: date, dateStyle: .none, timeStyle: .short)
                
                let line = "\(timeStr): \(item.intensity.forecast) gCO₂ (\(item.intensity.index))"
                let menuItem = NSMenuItem(title: line, action: nil, keyEquivalent: "")
                menu.addItem(menuItem)
            }
            menu.addItem(NSMenuItem.separator())
        }

        // 3. Actions
        let refreshItem = NSMenuItem(title: "Refresh Now", action: #selector(refreshClicked), keyEquivalent: "r")
        refreshItem.target = self
        menu.addItem(refreshItem)

        menu.addItem(NSMenuItem.separator())
        
        let quitItem = NSMenuItem(title: "Quit GridSense", action: #selector(quitClicked), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    @objc func refreshClicked() {
        if let button = statusItem.button {
            button.title = "Refreshing..."
        }
        fetchData()
    }

    @objc func quitClicked() {
        NSApplication.shared.terminate(self)
    }

    // MARK: - Data Fetching
    func fetchData() {
        guard let url = URL(string: "https://api.carbonintensity.org.uk/intensity") else { return }
        
        // Also fetch forecast for the dropdown? 
        // Let's do parallel or just chain them. Simple chain for now.
        
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else {
                print("Error fetching intensity: \(error?.localizedDescription ?? "Unknown error")")
                return
            }

            do {
                let result = try JSONDecoder().decode(IntensityResponse.self, from: data)
                if let current = result.data.first {
                    DispatchQueue.main.async {
                        self.updateStatus(intensity: current.intensity.actual ?? current.intensity.forecast, index: current.intensity.index)
                        self.fetchForecast() // Chain forecast fetch
                    }
                }
            } catch {
                print("JSON Decode Error: \(error)")
            }
        }
        task.resume()
    }

    func updateStatus(intensity: Int, index: String) {
        if let button = statusItem.button {
            // Optional: Add emoji based on index
            let icon: String
            switch index {
            case "very low": icon = "🟢"
            case "low": icon = "🟢"
            case "moderate": icon = "🟡"
            case "high": icon = "🟠"
            case "very high": icon = "🔴"
            default: icon = "⚪️"
            }
            button.title = "\(icon) \(intensity)g"
        }
    }

    func fetchForecast() {
        guard let url = URL(string: "https://api.carbonintensity.org.uk/intensity/forward/24") else { return }
        
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self = self, let data = data else { return }
            
            do {
                let result = try JSONDecoder().decode(ForecastResponse.self, from: data)
                DispatchQueue.main.async {
                    self.setupMenu(forecast: result.data)
                }
            } catch {
                print("Forecast Decode Error: \(error)")
            }
        }
        task.resume()
    }
}

// MARK: - Models
struct IntensityResponse: Codable {
    let data: [IntensityData]
}

struct ForecastResponse: Codable {
    let data: [ForecastItem]
}

struct IntensityData: Codable {
    let from: String
    let to: String
    let intensity: IntensityValue
}

struct ForecastItem: Codable {
    let from: String
    let to: String
    let intensity: IntensityValue
}

struct IntensityValue: Codable {
    let forecast: Int
    let actual: Int?
    let index: String
}

// MARK: - Entry Point
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory) // Hide from dock
app.run()
