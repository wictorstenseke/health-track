import { useState } from 'react'
import { importRows } from '../db/entries'
import { sv } from '../i18n/sv'
import { readCsvFiles, type ReadResult } from '../io/csvFiles'
import { summarize } from '../lib/csv'
import { formatDate } from '../lib/format'

/** Pick one or more CSV files → preview → confirm. */
export function ImportCsv() {
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
      <label className="block w-full cursor-pointer rounded-full bg-zinc-100 py-3 text-center font-semibold">
        {sv.import.button}
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          multiple
          className="sr-only"
          onChange={(e) => void pick(e.currentTarget)}
        />
      </label>
      {preview && (
        <div className="mt-3 rounded-2xl bg-zinc-50 p-4 text-sm">
          <p className="font-medium">
            {summary ? sv.import.found(summary.count, formatDate(summary.from), formatDate(summary.to)) : sv.import.nothingFound}
          </p>
          {preview.errors.length > 0 && (
            <details className="mt-2 text-zinc-500">
              <summary>{sv.import.invalid(preview.errors.length)}</summary>
              <ul className="mt-1 space-y-0.5 font-mono text-xs break-all">
                {preview.errors.map((e) => (
                  <li key={`${e.file}:${e.line}`}>{sv.import.invalidRow(e.file, e.line, e.text)}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setPreview(null)} className="flex-1 rounded-full bg-white py-2.5 font-semibold">
              {sv.common.cancel}
            </button>
            <button
              type="button"
              disabled={!summary}
              onClick={() => void confirm()}
              className="flex-1 rounded-full bg-ink py-2.5 font-semibold text-white disabled:opacity-40"
            >
              {sv.import.confirm}
            </button>
          </div>
        </div>
      )}
      {message && <p className="mt-2 text-center text-sm text-zinc-500">{message}</p>}
    </div>
  )
}
