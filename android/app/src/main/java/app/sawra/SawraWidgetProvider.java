package app.sawra;

import android.appwidget.AppWidgetManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class SawraWidgetProvider extends AppWidgetProvider {

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, SawraWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids.length == 0) {
            return;
        }
        Intent intent = new Intent(context, SawraWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        JSONObject data = WidgetDataStore.load(context);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_sawra);

            String reciterName = data.optString("reciterName", "Sawra");
            String surahName = data.optString("surahName", "Al-Fatihah");
            String surahArabic = data.optString("surahArabic", "الفَاتِحَة");
            int surahId = data.optInt("surahId", 1);
            boolean isPlaying = data.optBoolean("isPlaying", false);
            int progress = data.optInt("progressPercent", 0);

            views.setTextViewText(R.id.widget_reciter, reciterName);
            views.setTextViewText(R.id.widget_surah, surahId + ". " + surahName);
            views.setTextViewText(R.id.widget_surah_arabic, surahArabic);
            views.setTextViewText(
                R.id.widget_status,
                isPlaying ? "En lecture" : "Appuyez pour reprendre"
            );
            views.setProgressBar(R.id.widget_progress, 100, progress, false);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setAction(Intent.ACTION_VIEW);
            launchIntent.setData(Uri.parse("sawra://surah/" + surahId));
            launchIntent.putExtra("tab", "surahs");
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
