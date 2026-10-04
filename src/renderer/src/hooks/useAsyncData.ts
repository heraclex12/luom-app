// Lightweight async data hook (loading / error / manual reload) for local DB and online fetches.
// No caching, no retries — each reload reruns the fetcher and keeps the latest result.
// Races: only the most recent request's result is applied (seq guard); no setState after unmount.
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncData<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  /** Refetch with the same fetcher. Returns a Promise so callers can await and chain. */
  reload: () => Promise<void>
}

/**
 * Run `fetcher` and expose [data, loading, error]. Refetches when `deps` change (default: once on mount).
 * Keep `fetcher` stable with useCallback or put its real dependencies in `deps` — `deps` drives refetching.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncData<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(undefined)

  // Latest request sequence: only matching responses are applied (avoids stale results on fast reloads).
  const seqRef = useRef(0)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async () => {
    const seq = ++seqRef.current
    setLoading(true)
    setError(undefined)
    try {
      const result = await fetcher()
      if (mountedRef.current && seq === seqRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (e) {
      if (mountedRef.current && seq === seqRef.current) {
        setError(e)
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void run()
  }, [run])

  return { data, loading, error, reload: run }
}
