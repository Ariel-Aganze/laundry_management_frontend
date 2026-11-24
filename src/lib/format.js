import { useCallback, useMemo } from 'react'
import { useI18n } from '../context/I18nContext'
import { useSettings } from '../hooks/useSettings'

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  rw: ['Mut', 'Gas', 'Wer', 'Mat', 'Gic', 'Kam', 'Nya', 'Kan', 'Nze', 'Ukw', 'Ugu', 'Uku'],
}
const MONTHS_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  rw: ['Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena', 'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza'],
}

/** Parse "YYYY-MM-DD" as a local date (no timezone shift). */
export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

export function toISODate(date) {
  const d = date instanceof Date ? date : parseDate(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return toISODate(d)
}

export function daysBetween(fromISO, toISOValue) {
  const a = parseDate(fromISO)
  const b = parseDate(toISOValue)
  return Math.round((b - a) / 86400000)
}

export function useFormat() {
  const { lang } = useI18n()
  const { currency, currency_decimals: decimals } = useSettings()

  const number = useCallback(
    (value, digits = 0) =>
      Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    [],
  )

  const money = useCallback(
    (value, { short = false } = {}) => {
      const n = Number(value || 0)
      if (short && Math.abs(n) >= 1000) {
        const units = [
          [1e9, 'B'],
          [1e6, 'M'],
          [1e3, 'K'],
        ]
        const [div, suffix] = units.find(([d]) => Math.abs(n) >= d)
        return `${currency} ${(n / div).toLocaleString('en-US', { maximumFractionDigits: 1 })}${suffix}`
      }
      return `${currency} ${number(n, decimals)}`
    },
    [currency, decimals, number],
  )

  const date = useCallback(
    (value, { long = false } = {}) => {
      const d = parseDate(value)
      if (!d || Number.isNaN(d.getTime())) return '—'
      const months = (long ? MONTHS_LONG : MONTHS)[lang] || MONTHS.en
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
    },
    [lang],
  )

  const dateTime = useCallback(
    (value) => {
      const d = parseDate(value)
      if (!d || Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${date(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    [date],
  )

  const shortDate = useCallback(
    (value) => {
      const d = parseDate(value)
      if (!d) return ''
      return `${d.getDate()} ${(MONTHS[lang] || MONTHS.en)[d.getMonth()]}`
    },
    [lang],
  )

  return useMemo(() => ({ money, number, date, dateTime, shortDate, currency }), [money, number, date, dateTime, shortDate, currency])
}
