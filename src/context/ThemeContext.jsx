import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readTheme() {
  try {
    return localStorage.getItem('theme') || 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme) // 'light' | 'dark' | 'system'
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const mq = media()
    const listener = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  const isDark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    const color = isDark ? '#0f1114' : '#e6e8ec'
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color))
  }, [isDark])

  const setTheme = useCallback((value) => {
    setThemeState(value)
    try {
      localStorage.setItem('theme', value)
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme])

  const value = useMemo(() => ({ theme, isDark, setTheme, toggle }), [theme, isDark, setTheme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
