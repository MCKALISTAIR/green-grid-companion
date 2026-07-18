import AppKit
import Foundation

// MARK: - App Delegate
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var timer: Timer?
    
    var currentIntensity: Int?
    var currentIndex: String?
    var currentRegion: String?

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

    func getPostcode() -> String? {
        let fileManager = FileManager.default
        let homeDir = fileManager.homeDirectoryForCurrentUser
        let paths = [
            homeDir.appendingPathComponent(".gridsense"),
            homeDir.appendingPathComponent(".config/gridsense")
        ]
        for path in paths {
            if fileManager.fileExists(atPath: path.path) {
                do {
                    let content = try String(contentsOf: path, encoding: .utf8)
                    let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    if !trimmed.isEmpty {
                        return trimmed
                    }
                } catch {
                    print("Error reading postcode at \(path.path): \(error)")
                }
            }
        }
        return nil
    }

    func setupMenu(forecast: [ForecastItem] = []) {
        let menu = NSMenu()

        // 1. Current Status
        let regionSuffix = currentRegion != nil ? " (\(currentRegion!))" : ""
        let intensityLabel = currentIntensity != nil ? ": \(currentIndex!.capitalized) (\(currentIntensity!)g)" : ": Computing..."
        let statusTitle = "Grid Status\(regionSuffix)\(intensityLabel)"
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
        let postcode = getPostcode()
        let urlString: String
        let isRegional = postcode != nil

        if let pc = postcode {
            urlString = "https://api.carbonintensity.org.uk/regional/postcode/\(pc)"
        } else {
            urlString = "https://api.carbonintensity.org.uk/intensity"
        }

        guard let url = URL(string: urlString) else { return }
        
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else {
                print("Error fetching intensity: \(error?.localizedDescription ?? "Unknown error")")
                return
            }

            do {
                if isRegional {
                    let result = try JSONDecoder().decode(RegionalResponse.self, from: data)
                    if let region = result.data.first, let current = region.data.first {
                        DispatchQueue.main.async {
                            self.updateStatus(
                                intensity: current.intensity.actual ?? current.intensity.forecast,
                                index: current.intensity.index,
                                regionName: region.shortname
                            )
                            self.fetchForecast(postcode: postcode)
                        }
                    }
                } else {
                    let result = try JSONDecoder().decode(IntensityResponse.self, from: data)
                    if let current = result.data.first {
                        DispatchQueue.main.async {
                            self.updateStatus(
                                intensity: current.intensity.actual ?? current.intensity.forecast,
                                index: current.intensity.index,
                                regionName: "National"
                            )
                            self.fetchForecast(postcode: nil)
                        }
                    }
                }
            } catch {
                print("JSON Decode Error: \(error)")
            }
        }
        task.resume()
    }

    func updateStatus(intensity: Int, index: String, regionName: String) {
        if let button = statusItem.button {
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
        
        self.currentIntensity = intensity
        self.currentIndex = index
        self.currentRegion = regionName
    }

    func fetchForecast(postcode: String?) {
        let urlString: String
        let isRegional = postcode != nil

        if let pc = postcode {
            let formatter = ISO8601DateFormatter()
            let nowStr = formatter.string(from: Date())
            urlString = "https://api.carbonintensity.org.uk/regional/intensity/\(nowStr)/fw48h/postcode/\(pc)"
        } else {
            urlString = "https://api.carbonintensity.org.uk/intensity/forward/24"
        }

        guard let url = URL(string: urlString) else { return }
        
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let self = self, let data = data, error == nil else {
                print("Error fetching forecast: \(error?.localizedDescription ?? "Unknown error")")
                return
            }
            
            do {
                if isRegional {
                    let result = try JSONDecoder().decode(RegionalForecastResponse.self, from: data)
                    DispatchQueue.main.async {
                        self.setupMenu(forecast: result.data.data)
                    }
                } else {
                    let result = try JSONDecoder().decode(ForecastResponse.self, from: data)
                    DispatchQueue.main.async {
                        self.setupMenu(forecast: result.data)
                    }
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

struct RegionalResponse: Codable {
    let data: [RegionalData]
}

struct RegionalData: Codable {
    let shortname: String
    let data: [IntensityData]
}

struct RegionalForecastResponse: Codable {
    let data: RegionalForecastData
}

struct RegionalForecastData: Codable {
    let shortname: String
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
