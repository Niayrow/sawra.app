import WidgetKit
import SwiftUI

struct SawraWidgetEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPlaybackPayload
}

struct SawraWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> SawraWidgetEntry {
        SawraWidgetEntry(date: Date(), payload: WidgetSharedStore.load())
    }

    func getSnapshot(in context: Context, completion: @escaping (SawraWidgetEntry) -> Void) {
        completion(SawraWidgetEntry(date: Date(), payload: WidgetSharedStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SawraWidgetEntry>) -> Void) {
        let entry = SawraWidgetEntry(date: Date(), payload: WidgetSharedStore.load())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct SawraWidgetEntryView: View {
    var entry: SawraWidgetProvider.Entry

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.02, green: 0.09, blue: 0.16), Color(red: 0.01, green: 0.07, blue: 0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 6) {
                Text("SAWRA")
                    .font(.system(size: 10, weight: .black))
                    .foregroundStyle(Color(red: 0.2, green: 0.83, blue: 0.6))
                    .tracking(1.2)

                Text(entry.payload.surahArabic)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)

                Text("\(entry.payload.surahId). \(entry.payload.surahName)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(red: 0.95, green: 0.97, blue: 0.98))

                Text(entry.payload.reciterName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                    .lineLimit(1)

                ProgressView(value: Double(entry.payload.progressPercent), total: 100)
                    .tint(Color(red: 0.06, green: 0.73, blue: 0.51))

                Text(entry.payload.isPlaying ? "EN LECTURE" : "APPUYEZ POUR REPRENDRE")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    .tracking(0.8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
    }
}

@main
struct SawraWidgetBundle: WidgetBundle {
    var body: some Widget {
        SawraWidget()
    }
}

struct SawraWidget: Widget {
    let kind: String = "SawraWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SawraWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                SawraWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                SawraWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Sawra")
        .description("Reprenez votre dernière récitation depuis l'écran d'accueil.")
        .supportedFamilies([.systemMedium, .systemSmall])
    }
}
