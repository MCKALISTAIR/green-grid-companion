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

struct IntensityValue: Codable {
    let forecast: Int
    let actual: Int?
    let index: String
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), intensity: 50, index: "low", status: "Active")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        let entry = SimpleEntry(date: Date(), intensity: 45, index: "very low", status: "Snapshot")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        // Fetch data from API
        let url = URL(string: "https://api.carbonintensity.org.uk/intensity")!
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            var entries: [SimpleEntry] = []
            let currentDate = Date()
            
            if let data = data,
               let decoded = try? JSONDecoder().decode(IntensityResponse.self, from: data),
               let first = decoded.data.first {
                
                let intensity = first.intensity.forecast
                let index = first.intensity.index
                
                // Create an entry for now
                let entry = SimpleEntry(date: currentDate, intensity: intensity, index: index, status: "Live")
                entries.append(entry)
            } else {
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
            // Background
            ContainerRelativeShape()
                .fill(backgroundColor.gradient)
            
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
