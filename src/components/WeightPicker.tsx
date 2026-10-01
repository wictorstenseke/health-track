import { useState, type ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { toDialValue } from '../lib/dialMath'
import { formatNumber, parseDecimal } from '../lib/format'
import { haptic } from '../lib/haptics'
import { WeightDial } from './WeightDial'

function NudgeButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full bg-white text-2xl font-medium text-ink shadow-card active:scale-95"
    >
      {children}
    </button>
  )
}

/** Dial + big number with −/+ 0,1 buttons. Tap the number to type it. All values stay within the dial range. */
export function WeightPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [typing, setTyping] = useState(false)

  const nudge = (delta: number) => {
    haptic()
    onChange(toDialValue(value + delta))
  }

  const commitTyped = (text: string) => {
    setTyping(false)
    const parsed = parseDecimal(text)
    if (parsed !== null) onChange(toDialValue(parsed))
  }

  return (
    <div>
      <WeightDial value={value} onChange={onChange} />
      <div className="mt-1 flex items-center justify-center gap-5">
        <NudgeButton label={sv.home.decrease} onClick={() => nudge(-0.1)}>
          −
        </NudgeButton>
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
          <button
            type="button"
            aria-label={sv.home.typeValue}
            onClick={() => setTyping(true)}
            className="text-5xl font-semibold tracking-tight tabular-nums"
          >
            {formatNumber(value)}
            <span className="ml-1.5 text-2xl font-medium text-zinc-400">kg</span>
          </button>
        )}
        <NudgeButton label={sv.home.increase} onClick={() => nudge(0.1)}>
          +
        </NudgeButton>
      </div>
    </div>
  )
}
