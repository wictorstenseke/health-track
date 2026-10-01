import { useState } from 'react'
import { deleteEntry, updateEntry } from '../db/entries'
import { sv } from '../i18n/sv'
import { formatNumber, parseDecimal } from '../lib/format'
import { isValidValue, METRICS, type Entry } from '../lib/metrics'
import { BottomSheet } from './BottomSheet'
import { DateTimeField } from './DateTimeField'
import { DecimalField } from './Fields'
import { WeightPicker } from './WeightPicker'

/** Edit or delete one entry. Weight uses the dial; cm metrics a decimal field. */
export function EntrySheet({ entry, onClose, onDeleted }: { entry: Entry; onClose: () => void; onDeleted: (entry: Entry) => void }) {
  const isWeight = entry.metricId === 'weight'
  const [weight, setWeight] = useState(entry.value)
  const [text, setText] = useState(formatNumber(entry.value))
  const [takenAt, setTakenAt] = useState(entry.takenAt)
  const value = isWeight ? weight : parseDecimal(text)
  const valid = value !== null && isValidValue(entry.metricId, value)

  const save = async () => {
    if (value === null || !valid) return
    await updateEntry(entry.id, { value, takenAt })
    onClose()
  }

  const remove = async () => {
    const deleted = await deleteEntry(entry.id)
    onClose()
    if (deleted) onDeleted(deleted)
  }

  return (
    <BottomSheet title={sv.sheet.title} onClose={onClose}>
      {isWeight ? (
        <WeightPicker value={weight} onChange={setWeight} />
      ) : (
        <DecimalField label={sv.metrics[entry.metricId]} unit={METRICS[entry.metricId].unit} value={text} onChange={setText} invalid={!valid} />
      )}
      <div className="my-5 flex justify-center">
        <DateTimeField value={takenAt} onChange={(ts) => setTakenAt((prev) => ts ?? prev)} />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => void remove()} className="flex-1 rounded-full bg-red-500/10 py-4 font-semibold text-red-600 dark:text-red-400">
          {sv.common.delete}
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => void save()}
          className="flex-[2] rounded-full bg-ink py-4 font-semibold text-on-ink disabled:opacity-40"
        >
          {sv.common.save}
        </button>
      </div>
    </BottomSheet>
  )
}
