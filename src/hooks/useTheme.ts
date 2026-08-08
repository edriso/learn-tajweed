import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'tajweed-theme'

/**
 * The page background per theme, as sRGB. These mirror --color-ink-50 and
 * --color-ink-950 in src/index.css, and the same two values are inlined in the
 * boot script in index.html so the browser chrome is right before first paint.
 * Change the tokens and these have to change with them.
 */
const THEME_COLOR: Record<Theme, string> = {
  light: '#fbfaf7',
  dark: '#0a100c',
}

/** index.html already put the right class on <html>; read it back from there. */
function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Owns the light/dark choice and remembers it on this device. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme])
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // private browsing: the choice just does not persist
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, toggleTheme }
}
