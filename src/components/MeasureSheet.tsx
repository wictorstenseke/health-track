import { useState } from 'react'
import { addEntries } from '../db/entries'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidValue, MEASURE_METRIC_IDS, METRICS, type MetricId } from '../lib/metrics'
import { BottomSheet } from './BottomSheet'
import { DateTimeField } from './DateTimeField'
import { DecimalField } from './Fields'

/** Batch form: fill whichever measurements you took; all get the same timestamp. */
export function MeasureSheet({ onClose }: { onClose: () => void }) {
  const [texts, setTexts] = useState<Partial<Record<MetricId, string>>>({})
  const [takenAt, setTakenAt] = useState<number | null>(null)

  const items = MEASURE_METRIC_IDS.flatMap((metricId) => {
    const text = texts[metricId] ?? ''
    if (text.trim() === '') return []
    const value = parseDecimal(text)
    return [{ metricId, value: value !== null && isValidValue(metricId, value) ? value : null }]
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
      <div className="space-y-3">
        {MEASURE_METRIC_IDS.map((metricId) => (
          <DecimalField
            key={metricId}
            label={sv.metrics[metricId]}
            unit={METRICS[metricId].unit}
            value={texts[metricId] ?? ''}
            onChange={(text) => setTexts((t) => ({ ...t, [metricId]: text }))}
            invalid={items.some((i) => i.metricId === metricId && i.value === null)}
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
