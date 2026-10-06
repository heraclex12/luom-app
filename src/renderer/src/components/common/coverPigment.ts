// Generated covers are printed in one Đông Hồ pigment each, picked from the title so a book keeps its colour.
export const COVER_PIGMENTS = ['son', 'dong', 'cham', 'hoe', 'ink'] as const
export type CoverPigment = (typeof COVER_PIGMENTS)[number]

export function coverPigment(title: string): CoverPigment {
  let h = 0
  for (const ch of title.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return COVER_PIGMENTS[h % COVER_PIGMENTS.length]
}
