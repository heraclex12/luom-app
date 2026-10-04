// Reader sentence-translation bridge contract. Source is always English and target always Vietnamese,
// so the channel only carries the text and the provider.

/** Keyless public translation providers. */
export type TranslateProvider = 'google' | 'azure'

/** One translation request: English text + provider. */
export interface TranslateRequest {
  text: string
  provider: TranslateProvider
}
