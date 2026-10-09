// Lượm desktop widget (WidgetKit extension, built by scripts/build-widget.mjs into Luom.app/Contents/PlugIns).
// Shows the words you are learning, one at a time, in the app's look (white and soft grey, one green, the green seal).
// Quiz mode (default, set in the widget's Edit menu): the meaning stays hidden until you tap Show meaning, then
// Again / Got it count as a real review and the next word comes up. Otherwise the meaning shows with a Next button.
//
// Data in: <home>/Library/Application Support/envi-learn/widget.json, written by the app (src/main/widget.ts,
// contract in src/shared/widget.ts), read here through a read-only sandbox exception (LuomWidget.entitlements).
// Answers out: one small file each in .../envi-learn/widget-inbox/ (the one folder this extension may write); the
// app turns them into reviews. What's revealed / answered here lives in this extension's own container.
// Tapping a word opens it in Lượm (luom://word/<id>). Needs macOS 14 (desktop widgets, buttons).
import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Data (mirrors src/shared/widget.ts)

struct WidgetWord: Codable, Hashable {
  struct Example: Codable, Hashable {
    let en: String
    let vi: String
  }
  let dictId: Int
  let term: String
  let phonetic: String
  let meaning: String
  let example: Example?
  /** "thirsty" = due today, "sprout" = being learned. */
  let stage: String
  let glyph: [String]?
}

struct WidgetData: Codable {
  let version: Int
  let updatedAt: Double
  let dueToday: Int
  let rotateMinutes: Int
  let words: [WidgetWord]
}

/** The app's data folder in the real home (inside the sandbox, NSHomeDirectory() is this extension's container). */
enum AppFolder {
  static var url: URL {
    let home = getpwuid(getuid()).flatMap { $0.pointee.pw_dir.map { String(cString: $0) } } ?? NSHomeDirectory()
    return URL(fileURLWithPath: home).appendingPathComponent("Library/Application Support/envi-learn")
  }

  static func loadData() -> WidgetData? {
    guard let raw = try? Data(contentsOf: url.appendingPathComponent("widget.json")) else { return nil }
    return try? JSONDecoder().decode(WidgetData.self, from: raw)
  }

  /** Leave an answer for the app (src/main/widget.ts takeRatings). */
  static func sendAnswer(dictId: Int, good: Bool) {
    let now = Int(Date().timeIntervalSince1970 * 1000)
    let body = #"{"dictId":\#(dictId),"action":"\#(good ? "good" : "again")","at":\#(now)}"#
    let file = url.appendingPathComponent("widget-inbox/\(now)-\(dictId).json")
    try? Data(body.utf8).write(to: file, options: .atomic)
  }
}

/** What happened on the widget: the word whose meaning is showing, and words answered / skipped (hidden for a while). */
struct WidgetState: Codable {
  var revealed: Int?
  /** dictId → when it was answered or skipped (seconds since 1970). */
  var done: [Int: Double] = [:]

  /** Answered words stay out of the rotation this long (the app reschedules them meanwhile). */
  static let doneFor: TimeInterval = 8 * 3600

  private static var file: URL {
    let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir.appendingPathComponent("widget-state.json")
  }

  static func load(now: Date = Date()) -> WidgetState {
    var s = (try? Data(contentsOf: file)).flatMap { try? JSONDecoder().decode(WidgetState.self, from: $0) } ?? WidgetState()
    s.done = s.done.filter { now.timeIntervalSince1970 - $0.value < doneFor }
    return s
  }

  static func update(_ change: (inout WidgetState) -> Void) {
    var s = load()
    change(&s)
    if let raw = try? JSONEncoder().encode(s) { try? raw.write(to: file, options: .atomic) }
  }
}

// MARK: - Intents (the widget's buttons and its Edit menu)

struct WordsConfig: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Your words"
  static let description = IntentDescription("The words you are learning, words due for review first.")

  @Parameter(title: "Hide the meaning until I tap", default: true)
  var hideMeaning: Bool
}

struct ShowMeaningIntent: AppIntent {
  static let title: LocalizedStringResource = "Show meaning"
  static let isDiscoverable = false

  @Parameter(title: "Word") var dictId: Int

  init() {}
  init(dictId: Int) { self.dictId = dictId }

  func perform() async throws -> some IntentResult {
    WidgetState.update { $0.revealed = dictId }
    return .result()
  }
}

/** Got it / Again: a real review (the app rates it), then the next word. */
struct AnswerIntent: AppIntent {
  static let title: LocalizedStringResource = "Answer"
  static let isDiscoverable = false

  @Parameter(title: "Word") var dictId: Int
  @Parameter(title: "Remembered") var remembered: Bool

  init() {}
  init(dictId: Int, remembered: Bool) {
    self.dictId = dictId
    self.remembered = remembered
  }

  func perform() async throws -> some IntentResult {
    AppFolder.sendAnswer(dictId: dictId, good: remembered)
    WidgetState.update {
      $0.done[dictId] = Date().timeIntervalSince1970
      $0.revealed = nil
    }
    return .result()
  }
}

/** Next (meaning already shown): move on without rating. */
struct NextWordIntent: AppIntent {
  static let title: LocalizedStringResource = "Next word"
  static let isDiscoverable = false

  @Parameter(title: "Word") var dictId: Int

  init() {}
  init(dictId: Int) { self.dictId = dictId }

  func perform() async throws -> some IntentResult {
    WidgetState.update {
      $0.done[dictId] = Date().timeIntervalSince1970
      $0.revealed = nil
    }
    return .result()
  }
}

// MARK: - Timeline

struct WordsEntry: TimelineEntry {
  let date: Date
  /** Words from the one shown now onwards (the large widget lists the next ones). */
  let words: [WidgetWord]
  let dueToday: Int
  let quiz: Bool
  /** The meaning of the first word is showing (always when not in quiz mode). */
  let revealed: Bool
  /** There are words, but all of them were answered just now. */
  let allDone: Bool
}

struct WordsProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> WordsEntry {
    WordsEntry(date: Date(), words: Sample.words, dueToday: 3, quiz: true, revealed: false, allDone: false)
  }

  func snapshot(for config: WordsConfig, in context: Context) async -> WordsEntry {
    // The widget gallery shows real words when there are some, the sample otherwise.
    let real = entries(config: config, now: Date(), count: 1).first
    return real?.words.isEmpty == false
      ? real!
      : WordsEntry(date: Date(), words: Sample.words, dueToday: 3, quiz: config.hideMeaning, revealed: false, allDone: false)
  }

  func timeline(for config: WordsConfig, in context: Context) async -> Timeline<WordsEntry> {
    let now = Date()
    let list = entries(config: config, now: now, count: 8)
    // Read the file again after these entries (or in 30 min when empty) to pick up review progress.
    let next = list.count > 1 ? list.last!.date.addingTimeInterval(rotateSeconds) : now.addingTimeInterval(30 * 60)
    return Timeline(entries: list, policy: .after(next))
  }

  private var rotateSeconds: TimeInterval { TimeInterval(max(AppFolder.loadData()?.rotateMinutes ?? 15, 5) * 60) }

  /** One entry per rotation slot; the word follows the clock, so reloads keep the same order. */
  private func entries(config: WordsConfig, now: Date, count: Int) -> [WordsEntry] {
    let quiz = config.hideMeaning
    guard let data = AppFolder.loadData(), !data.words.isEmpty else {
      return [WordsEntry(date: now, words: [], dueToday: 0, quiz: quiz, revealed: false, allDone: false)]
    }
    let state = WidgetState.load(now: now)
    let words = data.words.filter { state.done[$0.dictId] == nil }
    if words.isEmpty {
      return [WordsEntry(date: now, words: [], dueToday: data.dueToday, quiz: quiz, revealed: false, allDone: true)]
    }
    let step = TimeInterval(max(data.rotateMinutes, 5) * 60)
    let firstSlot = Int(now.timeIntervalSince1970 / step)
    let n = words.count
    return (0..<(n == 1 ? 1 : count)).map { i in
      let slot = firstSlot + i
      let rotated = (0..<n).map { words[(slot + $0) % n] }
      return WordsEntry(
        date: i == 0 ? now : Date(timeIntervalSince1970: Double(slot) * step),
        words: rotated,
        dueToday: max(0, data.dueToday - data.words.filter { state.done[$0.dictId] != nil && $0.stage == "thirsty" }.count),
        quiz: quiz,
        revealed: !quiz || state.revealed == rotated[0].dictId,
        allDone: false)
    }
  }
}

enum Sample {
  static let words = [
    WidgetWord(
      dictId: 0, term: "pension", phonetic: "ˈpenʃən", meaning: "lương hưu, tiền trợ cấp",
      example: .init(en: "She lives on her pension.", vi: "Bà ấy sống bằng lương hưu."),
      stage: "thirsty", glyph: ["####.", "#...#", "####.", "#....", "#...."]),
    WidgetWord(
      dictId: 0, term: "acquisition", phonetic: "ˌækwɪˈzɪʃən", meaning: "sự mua lại, sự thu được",
      example: nil, stage: "sprout", glyph: [".###.", "#...#", "#####", "#...#", "#...#"]),
    WidgetWord(
      dictId: 0, term: "derive", phonetic: "dɪˈraɪv", meaning: "bắt nguồn, rút ra",
      example: .init(en: "Many words derive from Latin.", vi: "Nhiều từ bắt nguồn từ tiếng Latinh."),
      stage: "sprout", glyph: ["####.", "#...#", "#...#", "#...#", "####."]),
    WidgetWord(
      dictId: 0, term: "tonight", phonetic: "təˈnaɪt", meaning: "tối nay", example: nil,
      stage: "sprout", glyph: ["#####", "..#..", "..#..", "..#..", "..#.."]),
  ]
}

// MARK: - Look (palette from scripts/gen-theme.py; type: SF Pro Rounded, the system's closest kin to the app's SN Pro)

struct Palette {
  let dark: Bool
  init(_ scheme: ColorScheme) { dark = scheme == .dark }

  var page: Color { dark ? Color(hex: 0x111312) : Color(hex: 0xFFFFFF) }
  var ink: Color { dark ? Color(hex: 0xF5F5F7) : Color(hex: 0x1D1D1F) }
  var inkSecondary: Color { dark ? Color(hex: 0xC7C7CC) : Color(hex: 0x424245) }
  var inkMuted: Color { dark ? Color(hex: 0xA1A1A6) : Color(hex: 0x6E6E73) }
  var hairline: Color { ink.opacity(0.08) }
  /** The one green: main button, the seal. */
  var green: Color { Color(hex: 0x2A7D5A) }
  /** Green for text and marks on the page (lighter in dark). */
  var greenText: Color { dark ? Color(hex: 0x86D9B0) : Color(hex: 0x1F6B4B) }
  var seal: Color { dark ? Color(hex: 0x4FBF8A) : Color(hex: 0x2A7D5A) }
  var sealInk: Color { dark ? Color(hex: 0x111312) : Color.white }
  /** Soft fill of secondary buttons. */
  var soft: Color { ink.opacity(dark ? 0.1 : 0.06) }
  var amber: Color { dark ? Color(hex: 0xF5B54A) : Color(hex: 0xF2A531) }
}

extension Color {
  init(hex: UInt32) {
    self.init(
      .sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255, opacity: 1)
  }
}

extension Font {
  /** Titles and headwords: rounded, bold, like the app's SN Pro headings. */
  static func display(_ size: CGFloat) -> Font { .system(size: size, weight: .bold, design: .rounded) }
  /** Everything else, in the same rounded voice. */
  static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
    .system(size: size, weight: weight, design: .rounded)
  }
}

/** The word seal (components/seal/Seal.tsx): a rounded green tile with the word's first letter.
 *  thirsty = light wash with an amber ring (due), sprout = lower half filled (learning). */
struct SealView: View {
  let word: WidgetWord
  let size: CGFloat
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    let p = Palette(scheme)
    let thirsty = word.stage == "thirsty"
    let tile = RoundedRectangle(cornerRadius: size * 0.32, style: .continuous)
    ZStack {
      tile.fill(p.seal.opacity(thirsty ? 0.14 : 0))
      if !thirsty {
        VStack(spacing: 0) {
          Color.clear
          p.seal.opacity(0.3)
        }
      }
      Text(String(word.term.prefix(1)).uppercased())
        .font(.display(size * 0.56))
        .foregroundColor(p.seal)
      tile.strokeBorder(p.seal, lineWidth: max(1.25, size * 0.06))
    }
    .frame(width: size, height: size)
    .clipShape(tile)
    .padding(thirsty ? 2 : 0)
    .overlay(
      RoundedRectangle(cornerRadius: size * 0.32 + 2, style: .continuous)
        .strokeBorder(thirsty ? p.amber : Color.clear, lineWidth: 2)
    )
    .accessibilityLabel(thirsty ? "Due for review" : "Learning")
  }
}

/** An example sentence with the word in bold green. */
func markedSentence(_ sentence: String, term: String, color: Color) -> Text {
  guard let range = sentence.range(of: term, options: [.caseInsensitive, .diacriticInsensitive]) else {
    return Text(sentence)
  }
  return Text(sentence[..<range.lowerBound])
    + Text(sentence[range]).bold().foregroundColor(color)
    + Text(sentence[range.upperBound...])
}

/** Widget buttons: pills, a green one for the main action and a soft grey one beside it (as in the app). */
struct PillButtonStyle: ButtonStyle {
  let filled: Bool
  let p: Palette
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.ui(12, .semibold))
      .lineLimit(1)
      .frame(maxWidth: .infinity, minHeight: 28)
      .foregroundColor(filled ? .white : p.ink)
      .background(Capsule().fill(filled ? p.green : p.soft))
      .opacity(configuration.isPressed ? 0.75 : 1)
  }
}

/** A tappable part of a medium / large widget (previews can't draw Link, so they get the content alone). */
struct WordLink<Content: View>: View {
  let url: String
  @ViewBuilder let content: () -> Content
  var body: some View {
    #if WIDGET_PREVIEW
    content()
    #else
    Link(destination: URL(string: url)!) { content() }
    #endif
  }
}

// MARK: - Views

struct DueBadge: View {
  let count: Int
  let p: Palette
  var body: some View {
    if count > 0 {
      HStack(spacing: 4) {
        Circle().fill(p.amber).frame(width: 6, height: 6)
        Text("\(count) due").font(.ui(11, .medium)).foregroundColor(p.inkMuted)
      }
    }
  }
}

struct Headword: View {
  let word: WidgetWord
  let size: CGFloat
  let p: Palette
  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(word.term)
        .font(.display(size))
        .foregroundColor(p.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.55)
      if !word.phonetic.isEmpty {
        Text("/\(word.phonetic)/").font(.ui(11)).foregroundColor(p.inkMuted).lineLimit(1)
      }
    }
  }
}

/** Show meaning (quiz, hidden) / Again + Got it (quiz, revealed) / Next (meaning always shown). */
struct ActionRow: View {
  let entry: WordsEntry
  let word: WidgetWord
  let p: Palette
  var body: some View {
    HStack(spacing: 6) {
      if !entry.quiz {
        Button(intent: NextWordIntent(dictId: word.dictId)) { Text("Next") }
          .buttonStyle(PillButtonStyle(filled: false, p: p))
      } else if !entry.revealed {
        Button(intent: ShowMeaningIntent(dictId: word.dictId)) { Text("Show meaning") }
          .buttonStyle(PillButtonStyle(filled: true, p: p))
      } else {
        Button(intent: AnswerIntent(dictId: word.dictId, remembered: false)) { Text("Again") }
          .buttonStyle(PillButtonStyle(filled: false, p: p))
        Button(intent: AnswerIntent(dictId: word.dictId, remembered: true)) { Text("Got it") }
          .buttonStyle(PillButtonStyle(filled: true, p: p))
      }
    }
  }
}

struct EmptyWordsView: View {
  let allDone: Bool
  let p: Palette
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      RoundedRectangle(cornerRadius: 7, style: .continuous)
        .strokeBorder(p.inkMuted, style: StrokeStyle(lineWidth: 1.5, dash: [3, 2]))
        .frame(width: 22, height: 22)
      Spacer(minLength: 0)
      Text(allDone ? "All done for now" : "Your words show up here")
        .font(.display(15)).foregroundColor(p.ink)
      Text(allDone ? "Your words come back here as they need another look." : "Add a word in Lượm and start learning it.")
        .font(.ui(12)).foregroundColor(p.inkMuted)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct SmallView: View {
  let entry: WordsEntry
  let p: Palette
  var body: some View {
    if let w = entry.words.first {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top) {
          SealView(word: w, size: 22)
          Spacer()
          DueBadge(count: entry.dueToday, p: p)
        }
        Spacer(minLength: 4)
        Headword(word: w, size: entry.revealed ? 19 : 22, p: p)
        if entry.revealed {
          Text(w.meaning)
            .font(.ui(12)).foregroundColor(p.inkSecondary)
            .lineLimit(2).padding(.top, 3)
            .fixedSize(horizontal: false, vertical: true)
        }
        Spacer(minLength: 6)
        ActionRow(entry: entry, word: w, p: p)
      }
      .widgetURL(URL(string: "luom://word/\(w.dictId)"))
    } else {
      EmptyWordsView(allDone: entry.allDone, p: p)
    }
  }
}

struct MediumView: View {
  let entry: WordsEntry
  let p: Palette
  var body: some View {
    if let w = entry.words.first {
      HStack(alignment: .top, spacing: 14) {
        VStack(alignment: .leading, spacing: 0) {
          SealView(word: w, size: 22)
          Spacer(minLength: 4)
          Headword(word: w, size: 24, p: p)
          if entry.revealed {
            Text(w.meaning)
              .font(.ui(13)).foregroundColor(p.inkSecondary)
              .lineLimit(3).padding(.top, 4)
              .fixedSize(horizontal: false, vertical: true)
          } else {
            Text("What does it mean?").font(.ui(12)).foregroundColor(p.inkMuted).padding(.top, 4)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Spacer()
            DueBadge(count: entry.dueToday, p: p)
          }
          Spacer(minLength: 0)
          // The example is a clue while the meaning is hidden; its translation comes with the answer.
          if let ex = w.example {
            markedSentence(ex.en, term: w.term, color: p.greenText)
              .font(.ui(12)).foregroundColor(p.ink).lineLimit(3)
            if entry.revealed {
              Text(ex.vi).font(.ui(11)).foregroundColor(p.inkMuted).lineLimit(2)
            }
          }
          Spacer(minLength: 6)
          ActionRow(entry: entry, word: w, p: p)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      }
      .widgetURL(URL(string: "luom://word/\(w.dictId)"))
    } else {
      EmptyWordsView(allDone: entry.allDone, p: p)
    }
  }
}

struct LargeView: View {
  let entry: WordsEntry
  let p: Palette
  var body: some View {
    if let w = entry.words.first {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top) {
          SealView(word: w, size: 26)
          Spacer()
          DueBadge(count: entry.dueToday, p: p)
        }
        WordLink(url: "luom://word/\(w.dictId)") {
          Headword(word: w, size: 30, p: p).padding(.top, 8)
        }
        if entry.revealed {
          Text(w.meaning)
            .font(.ui(14)).foregroundColor(p.inkSecondary)
            .lineLimit(2).padding(.top, 4)
            .fixedSize(horizontal: false, vertical: true)
        } else {
          Text("What does it mean?").font(.ui(13)).foregroundColor(p.inkMuted).padding(.top, 4)
        }
        if let ex = w.example {
          markedSentence(ex.en, term: w.term, color: p.greenText)
            .font(.ui(12)).foregroundColor(p.ink).lineLimit(2).padding(.top, 8)
          if entry.revealed {
            Text(ex.vi).font(.ui(11)).foregroundColor(p.inkMuted).lineLimit(2).padding(.top, 1)
          }
        }
        ActionRow(entry: entry, word: w, p: p).padding(.top, 10)
        Spacer(minLength: 10)
        if entry.words.count > 1 {
          Text("Up next").font(.ui(11, .medium)).foregroundColor(p.inkMuted).padding(.bottom, 2)
          ForEach(Array(entry.words.dropFirst().prefix(3).enumerated()), id: \.offset) { i, n in
            if i > 0 { Rectangle().fill(p.hairline).frame(height: 1) }
            WordLink(url: "luom://word/\(n.dictId)") {
              HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(n.term).font(.display(14)).foregroundColor(p.ink).lineLimit(1)
                // In quiz mode the meanings of the coming words stay hidden too.
                Text(entry.quiz ? (n.phonetic.isEmpty ? "" : "/\(n.phonetic)/") : n.meaning)
                  .font(.ui(12)).foregroundColor(p.inkMuted).lineLimit(1)
                Spacer(minLength: 0)
              }
              .padding(.vertical, 5)
            }
          }
        }
      }
    } else {
      EmptyWordsView(allDone: entry.allDone, p: p)
    }
  }
}

struct LuomWidgetView: View {
  let entry: WordsEntry
  @Environment(\.widgetFamily) private var family
  var body: some View { WidgetBody(entry: entry, family: family) }
}

/** The widget for one size (split out so previews can pick the size). */
struct WidgetBody: View {
  let entry: WordsEntry
  let family: WidgetFamily
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    let p = Palette(scheme)
    Group {
      switch family {
      case .systemMedium: MediumView(entry: entry, p: p)
      case .systemLarge, .systemExtraLarge: LargeView(entry: entry, p: p)
      default: SmallView(entry: entry, p: p)
      }
    }
    .containerBackground(p.page, for: .widget)
  }
}

struct LuomWordsWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "LuomWords", intent: WordsConfig.self, provider: WordsProvider()) { entry in
      LuomWidgetView(entry: entry)
    }
    .configurationDisplayName("Your words")
    .description("The words you are learning, words due for review first. Tap Show meaning, then Again or Got it.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

#if !WIDGET_PREVIEW
@main
struct LuomWidgets: WidgetBundle {
  var body: some Widget { LuomWordsWidget() }
}
#endif
