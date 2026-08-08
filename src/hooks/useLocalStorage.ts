import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The event this hook fires at itself when a value changes in *this* tab.
 *
 * The native `storage` event is only delivered to other tabs, so two components
 * reading the same key in one tab drift apart until the next reload. That is
 * exactly what happens when the settings panel imports progress while the home
 * page is showing the progress bar behind it.
 */
const SAME_TAB_EVENT = 'tajweed:storage'

interface SameTabDetail {
  key: string
  /** Which hook instance wrote, so it can ignore its own echo. */
  source: object
}

/**
 * State that survives a refresh and stays in sync across tabs — and, through
 * the event above, across components inside one tab.
 *
 * Every read and write is wrapped in try/catch: localStorage throws in private
 * browsing on some browsers, and losing progress must never break the page.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue)
  const instance = useRef({})

  const read = useCallback((): T => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialRef.current
    } catch {
      return initialRef.current
    }
  }, [key])

  const [value, setValue] = useState<T>(read)

  // The latest value, reachable from `update` without being a dependency of it,
  // so the setter keeps a stable identity across renders.
  const valueRef = useRef(value)
  valueRef.current = value

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = next instanceof Function ? next(valueRef.current) : next
      // Set the ref first: two updates in the same tick must chain off each
      // other, not both off the value React has not re-rendered with yet.
      valueRef.current = resolved
      setValue(resolved)
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved))
      } catch {
        // ignore write failures
      }
      window.dispatchEvent(
        new CustomEvent<SameTabDetail>(SAME_TAB_EVENT, {
          detail: { key, source: instance.current },
        }),
      )
    },
    [key],
  )

  useEffect(() => {
    const self = instance.current
    function onStorage(event: StorageEvent) {
      if (event.key === key) setValue(read())
    }
    function onSameTab(event: Event) {
      const { detail } = event as CustomEvent<SameTabDetail>
      if (detail.key !== key || detail.source === self) return
      setValue(read())
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(SAME_TAB_EVENT, onSameTab)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(SAME_TAB_EVENT, onSameTab)
    }
  }, [key, read])

  return [value, update] as const
}
