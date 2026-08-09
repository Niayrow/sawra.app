package app.sawra;

import android.content.Context;
import org.json.JSONException;
import org.json.JSONObject;

public class WidgetDataStore {
    public static final String PREFS_NAME = "sawra_widget_prefs";
    public static final String KEY_DATA = "widget_data";

    private WidgetDataStore() {}

    public static void save(Context context, JSONObject data) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_DATA, data.toString())
            .apply();
    }

    public static JSONObject load(Context context) {
        String raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_DATA, null);
        if (raw == null || raw.isEmpty()) {
            return defaultPayload();
        }
        try {
            return new JSONObject(raw);
        } catch (JSONException e) {
            return defaultPayload();
        }
    }

    public static JSONObject defaultPayload() {
        JSONObject payload = new JSONObject();
        try {
            payload.put("reciterName", "Sawra");
            payload.put("surahName", "Al-Fatihah");
            payload.put("surahId", 1);
            payload.put("surahArabic", "الفَاتِحَة");
            payload.put("isPlaying", false);
            payload.put("progressPercent", 0);
            payload.put("updatedAt", System.currentTimeMillis());
        } catch (JSONException ignored) {
            // Unreachable for static keys.
        }
        return payload;
    }
}
