import { sv } from '../i18n/sv'
import { calendarDaysBetween } from './dates'
import type { Unit } from './metrics'

const LOCALE = 'sv-SE'
const oneDecimal = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const
const num = new Intl.NumberFormat(LOCALE, oneDecimal)
const signed = new Intl.NumberFormat(LOCALE, { ...oneDecimal, signDisplay: 'exceptZero' })
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const weekdayDayMonth = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const monthNarrow = new Intl.DateTimeFormat(LOCALE, { month: 'narrow' })

// sv-SE short months end with a dot ("okt."); the design uses "okt".
const stripDots = (s: string) => s.replace(/\./g, '')
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** 82,4 */
export const formatNumber = (v: number) => num.format(v)
/** 82,4 kg */
export const formatValue = (v: number, unit: Unit) => `${num.format(v)} ${unit}`
/** +0,3 / −0,3 / 0,0 */
export const formatDelta = (d: number) => signed.format(d)
/** 1 okt 2026 */
export const formatDate = (ts: number) => stripDots(dayMonthYear.format(ts))
/** ons 30 sep */
export const formatRowDate = (ts: number) => stripDots(weekdayDayMonth.format(ts))
/** Oktober 2026 */
export const formatMonthYear = (ts: number) => capitalize(monthYear.format(ts))
/** 07:32 */
export const formatTime = (ts: number) => time.format(ts)
/** J, F, M … for month index 0–11 */
export const formatMonthInitial = (monthIndex: number) => monthNarrow.format(new Date(2000, monthIndex, 1))

/** idag / igår / för 3 dagar sedan */
export function formatRelativeDay(ts: number, now: number): string {
  const days = calendarDaysBetween(ts, now)
  if (days <= 0) return sv.relative.today
  if (days === 1) return sv.relative.yesterday
  return sv.relative.daysAgo(days)
}

/** Parses user/CSV numbers: "82,4", "82.4", " 82,4 kg ". Returns null when not a plain decimal. */
export function parseDecimal(s: string): number | null {
  const cleaned = s.replace(/[\s ]/g, '').replace(/(kg|cm)$/i, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}
