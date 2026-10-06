const DAY_MS = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

/** Local wall-clock time without offset, e.g. `2026-10-01T07:32`. Used for CSV and date inputs. */
export function toLocalIso(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Parses `YYYY-MM-DD`, `YYYY/MM/DD`, optionally followed by `T` or space and `HH:mm[:ss]`, as local time.
 * Date-only values get 12:00 so a timezone shift can never move them to another day.
 */
export function parseLocalIso(s: string): number | null {
  const m = s.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, se] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d), h ? Number(h) : 12, mi ? Number(mi) : 0, se ? Number(se) : 0)
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null
  return date.getTime()
}

/** Parses Swedish `D/M` (no year, as Numbers exports a per-year sheet) as local noon in `year`. */
export function parseDayMonth(s: string, year: number): number | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [d, mo] = [Number(m[1]), Number(m[2])]
  const date = new Date(year, mo - 1, d, 12)
  if (date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date.getTime()
}

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whole calendar days from `from` to `to` (local time, DST-safe). */
export function calendarDaysBetween(from: number, to: number): number {
  return Math.round((startOfLocalDay(to) - startOfLocalDay(from)) / DAY_MS)
}

export function yearOf(ts: number): number {
  return new Date(ts).getFullYear()
}

const REF_YEAR = 2000 // leap year, so 29 Feb gets its own slot
const REF_START = new Date(REF_YEAR, 0, 1).getTime()

/** Position on a shared Jan–Dec axis (0 = 1 Jan 00:00, 365 = 31 Dec), with time of day as fraction. */
export function chartDay(ts: number): number {
  const d = new Date(ts)
  const day = Math.round((new Date(REF_YEAR, d.getMonth(), d.getDate()).getTime() - REF_START) / DAY_MS)
  return day + (d.getHours() * 60 + d.getMinutes()) / 1440
}

export const CHART_DAY_MAX = 366
export const MONTH_START_DAYS: number[] = Array.from({ length: 12 }, (_, m) => chartDay(new Date(REF_YEAR, m, 1).getTime()))
