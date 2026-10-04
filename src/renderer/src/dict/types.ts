// Local dict row shape (the `dict` table). `entry` is EnViEntry JSON text (shared/dictionary.ts) or null = not fetched yet.

/** One local dict row (read and write share the shape). */
export interface LocalDictRow {
  dictId: number
  term: string
  ukPhonetic: string | null
  usPhonetic: string | null
  ukAudioUrl: string | null
  usAudioUrl: string | null
  audioUrl: string | null
  entry: string | null
}
