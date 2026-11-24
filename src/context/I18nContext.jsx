import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from '../i18n/en'
import rw from '../i18n/rw'

const dictionaries = { en, rw }
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'rw', label: 'Kinyarwanda', short: 'RW' },
]

const I18nContext = createContext(null)

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)
}

function interpolate(text, vars) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`))
}

function initialLanguage() {
  try {
    const saved = localStorage.getItem('lang')
    if (saved && dictionaries[saved]) return saved
  } catch {
    /* ignore */
  }
  return 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const setLang = useCallback((code) => {
    if (dictionaries[code]) setLangState(code)
  }, [])

  const t = useCallback(
    (key, vars) => {
      const value = lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key)
      return typeof value === 'string' ? interpolate(value, vars) : key
    },
    [lang],
  )

  /** Translate if the key exists, otherwise return `fallback`. */
  const tMaybe = useCallback(
    (key, fallback, vars) => {
      const value = lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key)
      return typeof value === 'string' ? interpolate(value, vars) : fallback
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t, tMaybe }), [lang, setLang, t, tMaybe])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
