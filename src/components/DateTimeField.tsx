import type { ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { parseLocalIso, toLocalIso } from '../lib/dates'
import { formatDate, formatTime } from '../lib/format'

/** "Idag", or the picked date and time. `value` null means "now". */
export function dateTimeLabel(value: number | null): string {
  return value === null ? sv.home.today : `${formatDate(value)} ${formatTime(value)}`
}

/**
 * Opens the native date-time picker (transparent input on top). Shows "Idag · ändra" unless `children` replace
 * it (e.g. an icon; then `label` names the control). `value` null means "now"; clearing the picker resets to null.
 */
export function DateTimeField({
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
    // Size and text styling only for the default text, so `children` (an icon button) can set their own.
    <label className={`relative flex items-center ${children ? '' : 'w-fit text-sm text-zinc-500'} ${className}`}>
      {children ?? (
        <span>
          {dateTimeLabel(value)} · <span className="font-medium text-ember-600">{sv.common.change}</span>
        </span>
      )}
      <input
        aria-label={label}
        type="datetime-local"
        className="absolute inset-0 opacity-0"
        value={toLocalIso(value ?? Date.now())}
        max={toLocalIso(Date.now())}
        // `max` is only a hint to the picker; typed or pasted values can still be in the future.
        onChange={(e) => {
          const ts = parseLocalIso(e.target.value)
          onChange(ts === null ? null : Math.min(ts, Date.now()))
        }}
      />
    </label>
  )
}
