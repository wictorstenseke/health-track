import { useState, type ReactNode, type Ref } from 'react'
import { sv } from '../i18n/sv'
import { toDialValue } from '../lib/dialMath'
import { formatNumber, parseDecimal } from '../lib/format'
import { WeightDial } from './WeightDial'

/** Big number; tap it to type a value. Values stay within the dial range. `numberRef`: the digits, without "kg". */
export function WeightValue({
  value,
  onChange,
  numberRef,
}: {
  value: number
  onChange: (value: number) => void
  numberRef?: Ref<HTMLSpanElement>
}) {
  const [typing, setTyping] = useState(false)

  const commitTyped = (text: string) => {
    setTyping(false)
    const parsed = parseDecimal(text)
    if (parsed !== null) onChange(toDialValue(parsed))
  }

  return (
    <div className="flex justify-center">
      {typing ? (
        <input
          autoFocus
          inputMode="decimal"
          aria-label={sv.home.typeValue}
          defaultValue={formatNumber(value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => commitTyped(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-[5ch] bg-transparent text-center text-4xl font-semibold tracking-tight tabular-nums outline-none"
        />
      ) : (
        <button type="button" aria-label={sv.home.typeValue} onClick={() => setTyping(true)} className="text-4xl font-semibold tracking-tight tabular-nums">
          <span ref={numberRef} className="inline-block">
            {formatNumber(value)}
          </span>
          <span className="ml-1 text-lg font-medium text-faint">kg</span>
        </button>
      )}
    </div>
  )
}

/**
 * Hem's weight entry: one band (the dial's rim and white inside) with the number (and an optional `caption`
 * under it) on top, the scale in the middle, and below it `start` (the date button) on the left with `children`
 * (Spara) centred in the band.
 */
export function WeightScale({
  value,
  onChange,
  numberRef,
  caption,
  start,
  children,
}: {
  value: number
  onChange: (value: number) => void
  numberRef?: Ref<HTMLSpanElement>
  caption?: ReactNode
  start: ReactNode
  children: ReactNode
}) {
  return (
    // Same rim colours and 8 px rim as the dial's own band.
    <div className="rounded-[40px] bg-linear-to-r from-rim-end via-rim-mid to-rim-end p-2">
      <div className="rounded-[32px] bg-surface py-5">
        <WeightValue value={value} onChange={onChange} numberRef={numberRef} />
        {caption && <p className="text-center text-sm text-muted">{caption}</p>}
        <div className="mt-4">
          <WeightDial value={value} onChange={onChange} bare />
        </div>
        {/* Equal outer columns keep `children` centred whatever `start` is; 20 px in, like the bottom padding. */}
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center px-5">
          <div className="justify-self-start">{start}</div>
          {children}
        </div>
      </div>
    </div>
  )
}

/** The number above the dial. */
export function WeightPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <WeightValue value={value} onChange={onChange} />
      <div className="mt-3">
        <WeightDial value={value} onChange={onChange} />
      </div>
    </div>
  )
}
