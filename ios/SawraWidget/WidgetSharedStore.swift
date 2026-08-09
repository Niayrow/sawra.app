import Foundation

public struct WidgetPlaybackPayload: Codable {
    let reciterName: String
    let surahName: String
    let surahId: Int
    let surahArabic: String
    let isPlaying: Bool
    let progressPercent: Int
    let updatedAt: Double
}

enum WidgetSharedStore {
    static let appGroupId = "group.app.sawra"
    static let storageKey = "sawra_widget_data"

    static func load() -> WidgetPlaybackPayload {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let data = defaults.data(forKey: storageKey),
            let payload = try? JSONDecoder().decode(WidgetPlaybackPayload.self, from: data)
        else {
            return WidgetPlaybackPayload(
                reciterName: "Sawra",
                surahName: "Al-Fatihah",
                surahId: 1,
                surahArabic: "الفَاتِحَة",
                isPlaying: false,
                progressPercent: 0,
                updatedAt: Date().timeIntervalSince1970 * 1000
            )
        }
        return payload
    }
}
