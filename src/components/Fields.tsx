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

/** One-line text input. `error` shows under the field and marks it invalid; Enter calls `onEnter`. */
export function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  maxLength?: number
  error?: string
  autoFocus?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-muted">
        {props.label}
      </label>
      <input
        id={id}
        className={inputClass}
        value={props.value}
        maxLength={props.maxLength}
        autoFocus={props.autoFocus}
        autoComplete="off"
        enterKeyHint="done"
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && props.onEnter?.()}
      />
      {props.error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {props.error}
        </p>
      )}
    </div>
  )
}
