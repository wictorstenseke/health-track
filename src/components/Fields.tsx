import { useId } from 'react'

const inputClass =
  'w-full rounded-2xl bg-fill px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ember-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400'

/** Free-text decimal input; the caller parses with `parseDecimal` so "82,4" and "82.4" both work. */
export function DecimalField(props: {
  label: string
  unit: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-muted">
        {props.label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          className={`${inputClass} pr-12 tabular-nums`}
          value={props.value}
          aria-invalid={props.invalid ? true : undefined}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-faint">{props.unit}</span>
      </div>
    </div>
  )
}
