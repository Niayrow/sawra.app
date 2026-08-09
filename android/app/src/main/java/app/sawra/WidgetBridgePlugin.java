package app.sawra;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        JSObject payload = call.getData();
        if (payload == null) {
            call.reject("Missing widget payload");
            return;
        }

        try {
            JSONObject json = new JSONObject(payload.toString());
            WidgetDataStore.save(getContext(), json);
            SawraWidgetProvider.refreshAllWidgets(getContext());
            call.resolve();
        } catch (Exception error) {
            call.reject("Failed to update widget", error);
        }
    }

    @PluginMethod
    public void refreshWidgets(PluginCall call) {
        SawraWidgetProvider.refreshAllWidgets(getContext());
        call.resolve();
    }
}
