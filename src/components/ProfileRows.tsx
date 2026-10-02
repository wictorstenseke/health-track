import { useId } from 'react'
import { sv } from '../i18n/sv'
import { Row } from './GroupedList'

const inputClass = 'min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-faint focus:text-ink'

/**
 * The Namn and Längd rows of a Profil group, shared by setup and Inställningar. Empty fields say which one is
 * required, so a disabled Kom igång explains itself.
 */
export function ProfileRows(props: {
  name: string
  onNameChange: (name: string) => void
  onNameBlur?: () => void
  height: string
  onHeightChange: (height: string) => void
  onHeightBlur?: () => void
  heightInvalid: boolean
}) {
  const id = useId()
  return (
    <>
      <Row>
        <label htmlFor={`${id}-name`}>{sv.settings.name}</label>
        <input
          id={`${id}-name`}
          className={`${inputClass} text-muted`}
          value={props.name}
          placeholder={sv.settings.required}
          autoComplete="given-name"
          onChange={(e) => props.onNameChange(e.target.value)}
          onBlur={props.onNameBlur}
        />
      </Row>
      <Row>
        <label htmlFor={`${id}-height`}>{sv.settings.heightLabel}</label>
        <span className="flex min-w-0 flex-1 items-baseline justify-end gap-1 text-muted">
          <input
            id={`${id}-height`}
            inputMode="decimal"
            className={`${inputClass} tabular-nums aria-[invalid=true]:text-red-600 dark:aria-[invalid=true]:text-red-400`}
            value={props.height}
            placeholder={sv.settings.optional}
            aria-invalid={props.heightInvalid ? true : undefined}
            onChange={(e) => props.onHeightChange(e.target.value)}
            onBlur={props.onHeightBlur}
          />
          {props.height.trim() !== '' && 'cm'}
        </span>
      </Row>
    </>
  )
}
