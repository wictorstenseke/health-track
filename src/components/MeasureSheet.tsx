import { useState } from 'react'
import { addEntries } from '../db/entries'
import { useMetrics } from '../db/hooks'
import { addMetric } from '../db/metrics'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidValue, METRIC_NAME_MAX, nameProblem, unitOf, type MetricId } from '../lib/metrics'
import { BottomSheet } from './BottomSheet'
import { DateTimeField } from './DateTimeField'
import { DecimalField, TextField } from './Fields'
import { PlusLabel } from './PlusLabel'

/** Names a new measurement type. */
function NewMetricForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const metrics = useMetrics()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const problem = nameProblem(name, metrics)

  const save = async () => {
    // `saving` keeps a double tap from creating the type twice; the second attempt would be rejected as taken.
    if (problem || saving) return
    setSaving(true)
    await addMetric(name)
    onSaved()
  }

  return (
    <>
      <TextField
        label={sv.measures.name}
        value={name}
        onChange={setName}
        onEnter={() => void save()}
        maxLength={METRIC_NAME_MAX}
        // Not while saving: the new type can reach `metrics` before this form closes, and would read as taken.
        error={problem === 'taken' && !saving ? sv.measures.nameTaken : undefined}
        autoFocus
      />
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onClick={onCancel} className="h-10 rounded-full bg-fill px-5 text-base font-semibold">
          {sv.common.cancel}
        </button>
        <button
          type="button"
          disabled={problem !== null || saving}
          onClick={() => void save()}
          className="h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink disabled:opacity-40"
        >
          {sv.common.save}
        </button>
      </div>
    </>
  )
}

/**
 * Batch form: fill whichever measurements you took; all get the same timestamp. A second view in the same sheet
 * names a new type; what was typed in the fields stays while it is open.
 */
export function MeasureSheet({ onClose }: { onClose: () => void }) {
  const metrics = useMetrics()
  const [texts, setTexts] = useState<Partial<Record<MetricId, string>>>({})
  const [takenAt, setTakenAt] = useState<number | null>(null)
  // With no types there is nothing to fill in, so the sheet opens on the name form.
  const [creating, setCreating] = useState(metrics.length === 0)

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
    <BottomSheet title={creating ? sv.measures.newType : sv.measures.formTitle} onClose={onClose}>
      {creating ? (
        <NewMetricForm onSaved={() => setCreating(false)} onCancel={() => (metrics.length === 0 ? onClose() : setCreating(false))} />
      ) : (
        <>
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
          <button type="button" onClick={() => setCreating(true)} className="mt-4 block">
            <PlusLabel>{sv.measures.newType}</PlusLabel>
          </button>
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
        </>
      )}
    </BottomSheet>
  )
}
