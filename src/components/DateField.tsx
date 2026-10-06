import type { ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { parseLocalIso, toLocalIso } from '../lib/dates'
import { formatDate } from '../lib/format'
import { CalendarIcon } from './icons'

/** `YYYY-MM-DD` for `<input type="date">`. */
const toLocalDate = (ts: number) => toLocalIso(ts).slice(0, 10)

const isToday = (value: number | null) => value === null || toLocalDate(value) === toLocalDate(Date.now())

/** "Idag", or the picked date. `value` null means "now". */
export function dateLabel(value: number | null): string {
  return value === null || isToday(value) ? sv.home.today : formatDate(value)
}

/**
 * Opens the native date picker (transparent input on top). Shows a small "📅 Idag" pill unless `children` replace
 * it (e.g. an icon; then `label` names the control). `value` null means "now"; clearing the picker resets to null.
 * Only the date is picked: the time of day is kept from the current value (or now), capped at now.
 */
export function DateField({
  value,
  onChange,
  className = '',
  label,
  children,
}: {
  value: number | null
  onChange: (ts: number | null) => void
  /** Extra classes; the whole element opens the picker. */
  className?: string
  /** Accessible name when `children` are an icon. */
  label?: string
  children?: ReactNode
}) {
  return (
    // Pill styling only for the default content, so `children` (an icon button) can set their own.
    <label
      className={`relative flex items-center ${
        children
          ? ''
          : `h-7 w-fit gap-1 rounded-full px-2.5 text-xs font-medium [&_svg]:size-3.5 ${
              // Tinted while backdated, like the home screen's calendar button.
              isToday(value) ? 'bg-fill text-ink' : 'bg-ember-500/10 text-ember-600 dark:text-ember-400'
            }`
      } ${className}`}
    >
      {children ?? (
        <>
          <CalendarIcon />
          {dateLabel(value)}
        </>
      )}
      <input
        aria-label={label}
        type="date"
        className="absolute inset-0 opacity-0"
        value={toLocalDate(value ?? Date.now())}
        max={toLocalDate(Date.now())}
        // `max` is only a hint to the picker; typed or pasted values can still be in the future.
        onChange={(e) => {
          if (!e.target.value) return onChange(null)
          const time = toLocalIso(value ?? Date.now()).slice(11)
          const ts = parseLocalIso(`${e.target.value}T${time}`)
          onChange(ts === null ? null : Math.min(ts, Date.now()))
        }}
      />
    </label>
  )
}
