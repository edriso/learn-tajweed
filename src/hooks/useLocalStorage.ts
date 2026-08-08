import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * State that survives a refresh and stays in sync across tabs.
 * Every read and write is wrapped in try/catch: localStorage throws in private
 * browsing on some browsers, and losing progress must never break the page.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue)

  const read = useCallback((): T => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialRef.current
    } catch {
      return initialRef.current
    }
  }, [key])

  const [value, setValue] = useState<T>(read)

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // ignore write failures
        }
        return resolved
      })
    },
    [key],
  )

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === key) setValue(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, read])

  return [value, update] as const
}
