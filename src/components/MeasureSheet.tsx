import { useState } from 'react'
import { addEntries } from '../db/entries'
import { useMetrics } from '../db/hooks'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidValue, unitOf, type MetricId } from '../lib/metrics'
import { BottomSheet } from './BottomSheet'
import { DateTimeField } from './DateTimeField'
import { DecimalField } from './Fields'

/** Batch form: fill whichever measurements you took; all get the same timestamp. */
export function MeasureSheet({ onClose }: { onClose: () => void }) {
  const metrics = useMetrics()
  const [texts, setTexts] = useState<Partial<Record<MetricId, string>>>({})
  const [takenAt, setTakenAt] = useState<number | null>(null)

  const items = metrics.flatMap(({ id }) => {
    const text = texts[id] ?? ''
    if (text.trim() === '') return []
    const value = parseDecimal(text)
    return [{ metricId: id, value: value !== null && isValidValue(id, value) ? value : null }]
  })
  const canSave = items.length > 0 && items.every((i) => i.value !== null)

  const save = async () => {
    if (!canSave) return
    const valid = items.flatMap((i) => (i.value === null ? [] : [{ metricId: i.metricId, value: i.value }]))
    await addEntries(valid, takenAt ?? Date.now())
    onClose()
  }

  return (
    <BottomSheet title={sv.measures.formTitle} onClose={onClose}>
      {/* Scrolls when there are many types, so Spara stays on screen. The padding keeps the focus ring from being clipped. */}
      <div className="-mx-1 max-h-[40dvh] space-y-3 overflow-y-auto overscroll-contain px-1 py-1">
        {metrics.map(({ id, name }) => (
          <DecimalField
            key={id}
            label={name}
            unit={unitOf(id)}
            value={texts[id] ?? ''}
            onChange={(text) => setTexts((t) => ({ ...t, [id]: text }))}
            invalid={items.some((i) => i.metricId === id && i.value === null)}
          />
        ))}
      </div>
      <div className="my-5 flex justify-center">
        <DateTimeField value={takenAt} onChange={setTakenAt} />
      </div>
      <button
        type="button"
        disabled={!canSave}
        onClick={() => void save()}
        className="mx-auto block h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink disabled:opacity-40"
      >
        {sv.common.save}
      </button>
    </BottomSheet>
  )
}
