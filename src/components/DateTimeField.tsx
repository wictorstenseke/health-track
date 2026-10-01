import { sv } from '../i18n/sv'
import { parseLocalIso, toLocalIso } from '../lib/dates'
import { formatDate, formatTime } from '../lib/format'

/**
 * "Idag · ändra" link that opens the native date-time picker (transparent input on top).
 * `value` null means "now"; clearing the picker resets to null.
 */
export function DateTimeField({ value, onChange }: { value: number | null; onChange: (ts: number | null) => void }) {
  const label = value === null ? sv.home.today : `${formatDate(value)} ${formatTime(value)}`
  return (
    <label className="relative mx-auto flex w-fit items-center text-sm text-zinc-500">
      <span>
        {label} · <span className="font-medium text-ember-600">{sv.common.change}</span>
      </span>
      <input
        type="datetime-local"
        className="absolute inset-0 opacity-0"
        value={toLocalIso(value ?? Date.now())}
        onChange={(e) => onChange(parseLocalIso(e.target.value))}
      />
    </label>
  )
}
