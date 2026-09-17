import ExpoModulesCore
import WidgetKit

/**
 A widget cannot run this app's JavaScript, so the only way data reaches one is
 shared native storage: the app writes, the widget reads (AGENTS.md §8).

 That store is an **App Group**, which both the app target and the widget
 extension must be entitled to. If the entitlement is missing the suite simply
 does not exist, so every call here reports failure rather than pretending to
 have written something the widget will never see.
 */
public class WidgetBridgeModule: Module {
  /// Must match the App Group in app.config.ts and the widget target.
  private static let appGroup = "group.de.mekteb.app"
  private static let payloadKey = "widgetPayload"

  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    /// True when the App Group is reachable — the JS side uses this to decide
    /// whether widgets exist on this build at all.
    Function("isAvailable") { () -> Bool in
      UserDefaults(suiteName: WidgetBridgeModule.appGroup) != nil
    }

    /**
     Stores the payload as a JSON string, or clears it when `json` is nil.

     JSON rather than individual keys so the widget never renders half of one
     update and half of the next: one write, one read, one consistent picture.
     */
    AsyncFunction("setPayload") { (json: String?) -> Bool in
      guard let defaults = UserDefaults(suiteName: WidgetBridgeModule.appGroup) else {
        return false
      }

      if let json {
        defaults.set(json, forKey: WidgetBridgeModule.payloadKey)
      } else {
        defaults.removeObject(forKey: WidgetBridgeModule.payloadKey)
      }

      // Without this the widget keeps its last timeline until the OS decides
      // to refresh it, which can be hours.
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      return true
    }
  }
}
