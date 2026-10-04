// selection-helper — prints the text currently selected in the frontmost app as JSON:
//   {"text": "...", "source": "ax" | "copy" | "none", "trusted": true|false}
//
// 1. Accessibility API: read AXSelectedText from the focused element (no clipboard involved). Chromium/Electron
//    apps only build their accessibility tree on request, so we set AXManualAccessibility on the app first.
// 2. Fallback: post a clean ⌘C (private event source, so the user's still-held hotkey modifiers don't leak into
//    it), read the new clipboard content, then restore the previous clipboard exactly.
// 3. Nothing selected → source "none" (the app then falls back to whatever is already on the clipboard).
//
// Needs Accessibility permission for the parent app (Lượm); without it, "trusted": false.
import Cocoa
import ApplicationServices

func emit(_ text: String, _ source: String, _ trusted: Bool) {
  let payload: [String: Any] = ["text": text, "source": source, "trusted": trusted]
  let data = try! JSONSerialization.data(withJSONObject: payload, options: [])
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
  var value: CFTypeRef?
  return AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success ? value : nil
}

func selectedTextViaAX() -> String? {
  guard let app = NSWorkspace.shared.frontmostApplication else { return nil }
  let appElement = AXUIElementCreateApplication(app.processIdentifier)
  // Ask Chromium-based apps (Chrome, Edge, Electron) to expose their accessibility tree.
  AXUIElementSetAttributeValue(appElement, "AXManualAccessibility" as CFString, kCFBooleanTrue)
  for attempt in 0..<3 {
    if attempt > 0 { usleep(120_000) } // the tree is built asynchronously after the first request
    var focused = attribute(AXUIElementCreateSystemWide(), kAXFocusedUIElementAttribute)
    if focused == nil { focused = attribute(appElement, kAXFocusedUIElementAttribute) }
    guard let element = focused, CFGetTypeID(element) == AXUIElementGetTypeID() else { continue }
    let el = element as! AXUIElement
    if let text = attribute(el, kAXSelectedTextAttribute) as? String,
       !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return text
    }
  }
  return nil
}

func copyViaKeystroke() -> String? {
  let pasteboard = NSPasteboard.general
  // Snapshot every item and type so the user's clipboard comes back untouched.
  let saved: [[(NSPasteboard.PasteboardType, Data)]] = (pasteboard.pasteboardItems ?? []).map { item in
    item.types.compactMap { type in item.data(forType: type).map { (type, $0) } }
  }
  let before = pasteboard.changeCount

  let source = CGEventSource(stateID: .privateState)
  let cKey: CGKeyCode = 8 // ANSI "c"
  let down = CGEvent(keyboardEventSource: source, virtualKey: cKey, keyDown: true)
  let up = CGEvent(keyboardEventSource: source, virtualKey: cKey, keyDown: false)
  down?.flags = .maskCommand
  up?.flags = .maskCommand
  down?.post(tap: .cghidEventTap)
  up?.post(tap: .cghidEventTap)

  var copied: String?
  for _ in 0..<20 { // up to ~600 ms
    usleep(30_000)
    if pasteboard.changeCount != before {
      copied = pasteboard.string(forType: .string)
      break
    }
  }
  if pasteboard.changeCount != before {
    pasteboard.clearContents()
    let items = saved.map { pairs -> NSPasteboardItem in
      let item = NSPasteboardItem()
      for (type, data) in pairs { item.setData(data, forType: type) }
      return item
    }
    if !items.isEmpty { pasteboard.writeObjects(items) }
  }
  return copied
}

let trusted = AXIsProcessTrusted()
if !trusted {
  emit("", "none", false)
  exit(0)
}
if let text = selectedTextViaAX() {
  emit(text, "ax", true)
} else if CommandLine.arguments.contains("--no-copy") {
  emit("", "none", true)
} else if let text = copyViaKeystroke(), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
  emit(text, "copy", true)
} else {
  emit("", "none", true)
}
