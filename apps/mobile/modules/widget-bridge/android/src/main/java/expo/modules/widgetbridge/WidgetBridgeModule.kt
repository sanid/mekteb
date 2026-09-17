package expo.modules.widgetbridge

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android half of the widget data channel.
 *
 * A widget cannot run this app's JavaScript, so the only way data reaches one
 * is shared native storage: the app writes, the widget reads (AGENTS.md §8).
 *
 * On iOS the store is an App Group; on Android it is a plain
 * [SharedPreferences] file. The widget renders through
 * `react-native-android-widget`, whose headless task runs in the app's own
 * process, so `MODE_PRIVATE` on a fixed file name is sufficient — the task
 * reads exactly what the app wrote, as one JSON string.
 *
 * The module name must stay `WidgetBridge` — the JS side resolves
 * `requireOptionalNativeModule("WidgetBridge")` and expects the same shape on
 * both platforms.
 */
class WidgetBridgeModule : Module() {
  private companion object {
    /** SharedPreferences file, distinct from anything expo uses. */
    const val PREFS_NAME = "de.mekteb.app.widget"
    const val PAYLOAD_KEY = "widgetPayload"
  }

  private val reactContext: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    /**
     * True when the store is reachable — which it always is on Android. The
     * JS side uses this to decide whether widgets exist on this build at all,
     * so it must not throw.
     */
    Function("isAvailable") {
      true
    }

    /**
     * Stores the payload as a JSON string, or clears it when `json` is null.
     *
     * JSON rather than individual keys so the widget never renders half of
     * one update and half of the next: one write, one read, one consistent
     * picture.
     */
    AsyncFunction("setPayload") { json: String? ->
      val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      if (json != null) {
        prefs.edit().putString(PAYLOAD_KEY, json).apply()
      } else {
        prefs.edit().remove(PAYLOAD_KEY).apply()
      }
      true
    }

    /**
     * Reads the payload the app last wrote. Called by the widget task handler
     * (headless JS) each time the OS asks the widget to render — see
     * `src/widgets/task-handler.ts`.
     */
    Function("getPayload") {
      reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(PAYLOAD_KEY, null)
    }
  }
}
