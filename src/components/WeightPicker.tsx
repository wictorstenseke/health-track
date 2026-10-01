import { useState } from 'react'
import { sv } from '../i18n/sv'
import { toDialValue } from '../lib/dialMath'
import { formatNumber, parseDecimal } from '../lib/format'
import { WeightDial } from './WeightDial'

/** Big number; tap it to type a value. Values stay within the dial range. */
export function WeightValue({ value, onChange }: { value: number; onChange: (value: number) => void }) {
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
          className="w-[5ch] bg-transparent text-center text-5xl font-semibold tracking-tight tabular-nums outline-none"
        />
      ) : (
        <button type="button" aria-label={sv.home.typeValue} onClick={() => setTyping(true)} className="text-5xl font-semibold tracking-tight tabular-nums">
          {formatNumber(value)}
          <span className="ml-1.5 text-2xl font-medium text-zinc-400">kg</span>
        </button>
      )}
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
