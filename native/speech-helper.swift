// speech-helper <audio file>: what was said in an English recording, using Apple's on-device speech recognition
// (nothing leaves the Mac). Prints one JSON line:
//   {"text": "She stayed resilient", "words": [{"text": "She", "confidence": 0.95}, …], "alternatives": ["…"]}
// or {"error": "denied" | "restricted" | "unavailable" | "<message>"}. Used by src/main/voice.ts (Say it, shadowing).
import Foundation
import Speech

setvbuf(stdout, nil, _IONBF, 0)

func emit(_ object: [String: Any]) -> Never {
  let data = (try? JSONSerialization.data(withJSONObject: object)) ?? Data("{\"error\":\"json\"}".utf8)
  print(String(decoding: data, as: UTF8.self))
  exit(0)
}

guard CommandLine.arguments.count >= 2 else { emit(["error": "usage: speech-helper <audio file> [locale]"]) }
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let locale = Locale(identifier: CommandLine.arguments.count >= 3 ? CommandLine.arguments[2] : "en-US")

let auth = DispatchSemaphore(value: 0)
var status = SFSpeechRecognizer.authorizationStatus()
if status == .notDetermined {
  SFSpeechRecognizer.requestAuthorization { s in
    status = s
    auth.signal()
  }
  auth.wait()
}
switch status {
case .denied: emit(["error": "denied"])
case .restricted: emit(["error": "restricted"])
default: break
}

guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition
else { emit(["error": "unavailable"]) }
// Results arrive on this queue; the main thread waits below.
recognizer.queue = OperationQueue()

let request = SFSpeechURLRecognitionRequest(url: url)
request.requiresOnDeviceRecognition = true
request.shouldReportPartialResults = false
// Plain dictation: no punctuation guesses, no hints, so a mispronounced word is not "corrected" into the target.
request.addsPunctuation = false
request.taskHint = .dictation

let done = DispatchSemaphore(value: 0)
var output: [String: Any] = ["error": "timeout"]
recognizer.recognitionTask(with: request) { result, error in
  if let result, result.isFinal {
    let best = result.bestTranscription
    output = [
      "text": best.formattedString,
      "words": best.segments.map { ["text": $0.substring, "confidence": Double($0.confidence)] },
      "alternatives": result.transcriptions.dropFirst().prefix(3).map(\.formattedString),
    ]
    done.signal()
  } else if let error {
    // "No speech detected" is an answer too: nothing was heard.
    let message = error.localizedDescription
    output = message.localizedCaseInsensitiveContains("no speech") ? ["text": "", "words": [], "alternatives": []] : ["error": message]
    done.signal()
  }
}
_ = done.wait(timeout: .now() + 20)
emit(output)
