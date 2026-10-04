// TTS synthesis contract shared by main, preload and renderer.
//
// Edge "Read Aloud"'s free wss endpoint needs custom HTTP headers (User-Agent / Origin / Cookie /
// Sec-MS-GEC), which the renderer's WebSocket can't set, so synthesis runs in main (Node + ws) via
// `tts:synthesize`. The renderer gets audio bytes and word boundaries and handles decoding, speed,
// scheduling and highlighting.

/** A synthesis request; `text` is plain text (foliate markup already stripped). */
export interface TtsSynthesizeRequest {
  /**
   * SSML `xml:lang` (BCP-47), the voice's locale. Edge only honours `<voice name>`; changing
   * xml:lang yields identical output. It's set only because SSML requires it.
   */
  lang: string
  /** Plain text to synthesise. */
  text: string
  /** Edge voice id (e.g. `en-US-AndrewNeural`). */
  voice: string
  /**
   * Speech rate for SSML prosody. Usually 1.0: speed changes happen in the renderer (WSOLA).
   * Kept as a fallback for synthesising at a given rate directly.
   */
  rate: number
}

/**
 * Word boundary reported by Edge: `offset` / `duration` in 100ns ticks from audio start;
 * `text` is the source word. Used for word highlighting and seeking.
 */
export interface TtsWordBoundary {
  offset: number
  duration: number
  text: string
}

/** Synthesis result: MP3 bytes (audio-24khz-48kbitrate-mono-mp3) + word boundaries. */
export interface TtsSynthesizeResult {
  audio: ArrayBuffer
  boundaries: TtsWordBoundary[]
}
