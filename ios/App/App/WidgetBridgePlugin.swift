import Foundation
import Capacitor
import WidgetKit

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

    static func save(_ payload: WidgetPlaybackPayload) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        if let data = try? JSONEncoder().encode(payload) {
            defaults.set(data, forKey: storageKey)
        }
    }

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

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidgets", returnType: CAPPluginReturnPromise)
    ]

    @objc func updateWidget(_ call: CAPPluginCall) {
        let payload = WidgetPlaybackPayload(
            reciterName: call.getString("reciterName") ?? "Sawra",
            surahName: call.getString("surahName") ?? "Al-Fatihah",
            surahId: call.getInt("surahId") ?? 1,
            surahArabic: call.getString("surahArabic") ?? "الفَاتِحَة",
            isPlaying: call.getBool("isPlaying") ?? false,
            progressPercent: call.getInt("progressPercent") ?? 0,
            updatedAt: call.getDouble("updatedAt") ?? Date().timeIntervalSince1970 * 1000
        )

        WidgetSharedStore.save(payload)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }

    @objc func refreshWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
