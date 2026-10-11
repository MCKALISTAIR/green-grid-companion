import WidgetKit
import SwiftUI

// MARK: - Models
struct IntensityResponse: Codable {
    let data: [IntensityData]
}

struct IntensityData: Codable {
    let from: String
    let to: String
    let intensity: IntensityValue
}

struct RegionalResponse: Codable {
    let data: [RegionalDataWrapper]
}

struct RegionalDataWrapper: Codable {
    let regionid: Int
    let dnoregion: String
    let shortname: String
    let data: [IntensityData]
}

struct IntensityValue: Codable {
    let forecast: Int
    let actual: Int?
    let index: String
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    // App Group shared with the main app. Read from the widget's Info.plist
    // (GSAppGroupIdentifier, filled from the GS_APP_GROUP_ID build setting)
    // so it always matches the app's SharedPrefsPlugin and entitlements.
    let suiteName = Bundle.main.object(forInfoDictionaryKey: "GSAppGroupIdentifier") as? String

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), intensity: 50, index: "low", status: "Active")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        let entry = SimpleEntry(date: Date(), intensity: 45, index: "very low", status: "Snapshot")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        // 1. Try to read selected Region ID from App Group
        let userDefaults = suiteName.flatMap { UserDefaults(suiteName: $0) }
        let regionId = userDefaults?.string(forKey: "selected_region_id")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        
        // 2. Build URL based on region
        let useRegional = !regionId.isEmpty
        let urlString = useRegional 
            ? "https://api.carbonintensity.org.uk/regional/regionid/\(regionId)"
            : "https://api.carbonintensity.org.uk/intensity"
            
        print("Widget Fetching URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            // Fallback
            let entry = SimpleEntry(date: Date(), intensity: 0, index: "url_error", status: "Error")
            completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1800))))
            return
        }
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            var entries: [SimpleEntry] = []
            let currentDate = Date()
            
            if let data = data {
                // Determine if we are parsing National or Regional structure
                // National: { data: [ { from, to, intensity: { forecast, actual, index } } ] }
                // Regional: { data: [ { from, to, data: [ { intensity: { forecast, index } } ] } ] } -- Wait, structure is different!
                
                // Let's decode loosely or handle both struct types?
                // Simplification for now: If regional, the "intensity" field is deeper.
                // Let's look at the response shape:
                // National: { data: [ { intensity: { forecast: 99, index: "moderate" } } ] }
                // Regional: { data: [ { data: [ { intensity: { forecast: 99, index: "moderate" } } ] } ] } (It's nested!)
                
                // We need separate Codables.
                if useRegional {
                    if let decoded = try? JSONDecoder().decode(RegionalResponse.self, from: data),
                       let firstRegionData = decoded.data.first?.data.first {
                        let intensity = firstRegionData.intensity.forecast
                        let index = firstRegionData.intensity.index
                        let entry = SimpleEntry(date: currentDate, intensity: intensity, index: index, status: "Regional: \(regionId)")
                        entries.append(entry)
                    }
                } else {
                    if let decoded = try? JSONDecoder().decode(IntensityResponse.self, from: data),
                       let first = decoded.data.first {
                        let intensity = first.intensity.forecast
                        let index = first.intensity.index
                        let entry = SimpleEntry(date: currentDate, intensity: intensity, index: index, status: "National")
                        entries.append(entry)
                    }
                }
            } 
            
            if entries.isEmpty {
                // Fallback / Error
                let entry = SimpleEntry(date: currentDate, intensity: 0, index: "error", status: "Error")
                entries.append(entry)
            }
            
            // Refresh every 30 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate)!
            let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
            completion(timeline)
        }
        task.resume()
    }
}

// MARK: - Timeline Entry
struct SimpleEntry: TimelineEntry {
    let date: Date
    let intensity: Int
    let index: String
    let status: String
}

// MARK: - Widget View
struct GridSenseWidgetEntryView : View {
    var entry: Provider.Entry
    
    // Color Logic
    var backgroundColor: Color {
        switch entry.index {
        case "very low": return Color(red: 22/255, green: 163/255, blue: 74/255) // Green 600
        case "low": return Color(red: 34/255, green: 197/255, blue: 94/255) // Green 500
        case "moderate": return Color(red: 234/255, green: 179/255, blue: 8/255) // Yellow 500
        case "high": return Color(red: 249/255, green: 115/255, blue: 22/255) // Orange 500
        case "very high": return Color(red: 239/255, green: 68/255, blue: 68/255) // Red 500
        default: return Color.gray
        }
    }

    var body: some View {
        ZStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "leaf.fill")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.9))
                    Text("GRID UK")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white.opacity(0.9))
                    Spacer()
                }
                
                Spacer()
                
                Text("\(entry.intensity)")
                    .font(.system(size: 42, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.5)
                
                Text("gCO₂/kWh")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.white.opacity(0.8))
                
                Spacer()
                
                HStack {
                    Text(entry.index.capitalized)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(12)
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Text(entry.date, style: .time)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.6))
                }
            }
            .padding()
        }
        .widgetBackground(backgroundGradient)
    }

    // Color.gradient is iOS 16+; build the gradient by hand so the widget
    // still runs on iOS 15 (the app's deployment target).
    var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [backgroundColor, backgroundColor.opacity(0.85)],
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

// iOS 17+ shows "Please adopt containerBackground API" instead of the widget
// unless the background is supplied via containerBackground(for: .widget).
extension View {
    @ViewBuilder
    func widgetBackground<Background: View>(_ background: Background) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) { background }
        } else {
            self.background(background)
        }
    }
}

// MARK: - Main Widget Config
@main
struct GridSenseWidget: Widget {
    let kind: String = "GridSenseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            GridSenseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Carbon Intensity")
        .description("Current National Grid carbon intensity.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview
struct GridSenseWidget_Previews: PreviewProvider {
    static var previews: some View {
        GridSenseWidgetEntryView(entry: SimpleEntry(date: Date(), intensity: 45, index: "very low", status: "Preview"))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
        
        GridSenseWidgetEntryView(entry: SimpleEntry(date: Date(), intensity: 230, index: "high", status: "Preview"))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
