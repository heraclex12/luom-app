// Debounced value: updates delayMs after the last change; further changes restart the timer.
// Turns high-frequency input (keystrokes) into a low-frequency dependency to avoid a DB query per key.
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
