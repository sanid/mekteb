import SwiftUI
import WidgetKit

/**
 The Mekteb home-screen widget.

 It shows what the app last wrote into the shared App Group: the next thing to
 do and when the next class is. A widget cannot call the API or run the app's
 JavaScript, so it renders text that is **already translated and formatted** —
 there is no message catalogue and no date formatter on this side of the fence.

 It also refreshes on the OS's schedule, not ours, so everything here has to
 survive being a few hours old.
 */

// MARK: - Payload

/// Mirrors `WidgetPayload` in `src/lib/widget.ts`. Keep the two in step.
struct WidgetPayload: Codable {
  struct Item: Codable {
    let title: String
    let caption: String?
  }

  struct Hifz: Codable {
    let label: String
    let value: String
    let percent: Int
  }

  let updatedAt: String
  let headline: String
  let headlineCaption: String?
  let items: [Item]
  let lessonLabel: String
  let lessonValue: String?
  let hifz: Hifz?
}

/// Must match `WidgetBridgeModule.swift` and the app's entitlements.
private let appGroup = "group.de.mekteb.app"
private let payloadKey = "widgetPayload"

private func loadPayload() -> WidgetPayload? {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let json = defaults.string(forKey: payloadKey),
    let data = json.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

// MARK: - Timeline

struct MektebEntry: TimelineEntry {
  let date: Date
  let payload: WidgetPayload?
}

struct MektebProvider: TimelineProvider {
  func placeholder(in context: Context) -> MektebEntry {
    MektebEntry(date: Date(), payload: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (MektebEntry) -> Void) {
    completion(MektebEntry(date: Date(), payload: loadPayload()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MektebEntry>) -> Void) {
    /*
     One entry, aged out hourly. The app pushes updates itself whenever it is
     opened and reloads the timeline immediately, so this schedule only covers
     the case where nobody has opened the app in a while. There is nothing to
     compute ahead of time — only stale text to re-read.
     */
    let entry = MektebEntry(date: Date(), payload: loadPayload())
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - Views

private struct Row: View {
  let title: String
  let caption: String?

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(title)
        .font(.system(size: 14, weight: .semibold))
        .lineLimit(2)
      if let caption, !caption.isEmpty {
        Text(caption)
          .font(.system(size: 11))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    }
  }
}

private struct LessonRow: View {
  let label: String
  let value: String
  let stacked: Bool

  private var icon: some View {
    Image(systemName: "calendar")
      .font(.system(size: 10))
      .foregroundStyle(Color("$accent"))
  }

  var body: some View {
    if stacked {
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          icon
          Text(label)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.secondary)
        }
        Text(value)
          .font(.system(size: 11, weight: .medium))
          .lineLimit(1)
          // A long weekday in Bosnian or Turkish still has to fit rather than
          // disappear behind an ellipsis.
          .minimumScaleFactor(0.8)
      }
    } else {
      HStack(spacing: 4) {
        icon
        Text(label)
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(.secondary)
        Text(value)
          .font(.system(size: 10))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
    }
  }
}

/// Shown before anyone signs in. A widget that renders nothing looks broken,
/// and with no payload there is no locale to write a sentence in.
private struct EmptyStateView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("Mekteb")
        .font(.system(size: 15, weight: .bold))
      Text("—")
        .font(.system(size: 13))
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct MektebWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: MektebEntry

  var body: some View {
    if let payload = entry.payload {
      VStack(alignment: .leading, spacing: 8) {
        Row(title: payload.headline, caption: payload.headlineCaption)

        // The medium widget has room for a parent's other children; the small
        // one shows the single most urgent thing plus the next lesson.
        if family != .systemSmall {
          ForEach(Array(payload.items.prefix(2).enumerated()), id: \.offset) { _, item in
            Row(title: item.title, caption: item.caption)
          }
        }

        Spacer(minLength: 0)

        if let lesson = payload.lessonValue {
          LessonRow(
            label: payload.lessonLabel,
            value: lesson,
            // At 2×2 the label and the date do not fit on one line: the first
            // real render truncated "Sa. 8. Aug. · 17:30" to "Sa. 8. Aug.…",
            // hiding the time — the one part of it somebody checks a widget
            // for. Stacked on the small family, side by side on the medium.
            stacked: family == .systemSmall
          )
        }

        if let hifz = payload.hifz {
          VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
              Text(hifz.label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
              Text(hifz.value)
                .font(.system(size: 10))
            }
            // A bar, not a number: months of memorisation read better as
            // something visibly filling up.
            GeometryReader { geo in
              ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.25))
                Capsule()
                  .fill(Color("$accent"))
                  .frame(
                    width: geo.size.width * min(1, max(0, Double(hifz.percent) / 100))
                  )
              }
            }
            .frame(height: 4)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    } else {
      EmptyStateView()
    }
  }
}

// MARK: - Widget

@main
struct MektebWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MektebWidget", provider: MektebProvider()) { entry in
      Group {
        if #available(iOS 17.0, *) {
          MektebWidgetView(entry: entry)
            .containerBackground(Color("$widgetBackground"), for: .widget)
        } else {
          MektebWidgetView(entry: entry)
            .padding()
            .background(Color("$widgetBackground"))
        }
      }
      // Tapping the widget opens the app (scheme "mekteb" from app.config.ts).
      .widgetURL(URL(string: "mekteb://"))
    }
    .configurationDisplayName("Mekteb")
    .description("Aufgaben und der nächste Termin.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
