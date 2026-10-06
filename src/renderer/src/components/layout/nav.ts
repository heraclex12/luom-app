// Sidebar sections (pure). Labels match the page titles they open.
export const NAV_PATHS = ['/wordbook', '/wordbook/play', '/lookup', '/reading', '/resources'] as const

/** Pages under /wordbook that open from Play: the games and activities, the stories, and Garden rescue. */
const PLAY_PREFIXES = ['/wordbook/play', '/wordbook/episodes', '/wordbook/story', '/wordbook/garden']

/** Play owns the PLAY_PREFIXES pages; every other /wordbook page belongs to My words. */
export function activeNavPath(pathname: string): string | null {
  if (PLAY_PREFIXES.some((p) => pathname.startsWith(p))) return '/wordbook/play'
  return NAV_PATHS.find((path) => path !== '/wordbook/play' && pathname.startsWith(path)) ?? null
}
