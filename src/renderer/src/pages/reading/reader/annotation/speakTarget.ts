// What the selection's speaker button does (pure; tested in speakTarget.test.ts).

const MAX_WORDS = 3
const MAX_CHARS = 40

export function speakTarget(selected: string, fixedLayout: boolean): { kind: 'word'; text: string } | { kind: 'read-aloud' } {
  // Collapse spaces, drop leading punctuation and trailing commas / colons (a sentence keeps its full stop).
  const text = selected.replace(/\s+/g, ' ').trim().replace(/^[^\p{L}\p{N}]+/u, '').replace(/[\s,;:]+$/, '')
  const short = text.length <= MAX_CHARS && text.split(' ').length <= MAX_WORDS
  return short || fixedLayout ? { kind: 'word', text } : { kind: 'read-aloud' }
}
