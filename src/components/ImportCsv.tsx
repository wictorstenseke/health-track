import { useState } from 'react'
import { importRows } from '../db/entries'
import { sv } from '../i18n/sv'
import { readCsvFiles, type ReadResult } from '../io/csvFiles'
import { summarize } from '../lib/csv'
import { formatDate, formatValue } from '../lib/format'
import { METRICS } from '../lib/metrics'
import { ChevronRightIcon } from './icons'

/** Pick one or more CSV files → preview → confirm. `row` is the settings-list look. */
export function ImportCsv({ variant = 'button' }: { variant?: 'button' | 'row' }) {
  const row = variant === 'row'
  const [preview, setPreview] = useState<ReadResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const summary = preview && summarize(preview.rows)

  const pick = async (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return
    setMessage(null)
    setPreview(await readCsvFiles(files))
  }

  const confirm = async () => {
    if (!preview) return
    const result = await importRows(preview.rows)
    setPreview(null)
    setMessage(sv.import.done(result.added, result.skipped))
  }

  return (
    <div>
      <label
        className={
          row
            ? 'flex min-h-13 w-full cursor-pointer items-center justify-between px-5'
            : 'block w-full cursor-pointer rounded-full bg-fill py-3 text-center font-semibold'
        }
      >
        {sv.import.button}
        {row && (
          <span className="text-faint">
            <ChevronRightIcon />
          </span>
        )}
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          multiple
          className="sr-only"
          onChange={(e) => void pick(e.currentTarget)}
        />
      </label>
      {preview && (
        <div className={`rounded-2xl bg-fill/50 p-4 text-sm ${row ? 'mx-4 mb-4' : 'mt-3'}`}>
          <p className="font-medium">
            {summary ? sv.import.found(summary.count, formatDate(summary.from), formatDate(summary.to)) : sv.import.nothingFound}
          </p>
          {preview.rows.length > 0 && (
            <div className="mt-1 text-xs text-muted">
              <p>{sv.import.sample}</p>
              <ul>
                {preview.rows.slice(0, 3).map((row, i) => (
                  <li key={i}>
                    {formatDate(row.takenAt)}: {formatValue(row.value, METRICS[row.metricId].unit)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.errors.length > 0 && (
            <details className="mt-2 text-muted">
              <summary>{sv.import.invalid(preview.errors.length)}</summary>
              <ul className="mt-1 space-y-0.5 font-mono text-xs break-all">
                {preview.errors.map((e) => (
                  <li key={`${e.file}:${e.line}`}>{sv.import.invalidRow(e.file, e.line, e.text)}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setPreview(null)} className="flex-1 rounded-full bg-surface py-2.5 font-semibold">
              {sv.common.cancel}
            </button>
            <button
              type="button"
              disabled={!summary}
              onClick={() => void confirm()}
              className="flex-1 rounded-full bg-ink py-2.5 font-semibold text-on-ink disabled:opacity-40"
            >
              {sv.import.confirm}
            </button>
          </div>
        </div>
      )}
      {message && <p className={`text-sm text-muted ${row ? 'px-5 pb-3' : 'mt-2 text-center'}`}>{message}</p>}
    </div>
  )
}
