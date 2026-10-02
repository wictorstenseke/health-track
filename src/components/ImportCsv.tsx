import { useState } from 'react'
import { importRows } from '../db/entries'
import { sv } from '../i18n/sv'
import { readCsvFiles, type FileCsvError } from '../io/csvFiles'
import { summarize, type CsvSummary } from '../lib/csv'
import { formatDate } from '../lib/format'
import { rowClass } from './GroupedList'
import { ChevronRightIcon } from './icons'

interface ImportResult {
  summary: CsvSummary | null
  added: number
  skipped: number
  errors: FileCsvError[]
}

/** A list row that imports the picked CSV files straight away (duplicates are skipped), then says what it found. */
export function ImportCsv() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const pick = async (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return
    setBusy(true)
    setResult(null)
    try {
      const { rows, errors } = await readCsvFiles(files)
      const summary = summarize(rows)
      const { added, skipped } = summary ? await importRows(rows) : { added: 0, skipped: 0 }
      setResult({ summary, added, skipped, errors })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className={`${rowClass} cursor-pointer ${busy ? 'pointer-events-none opacity-40' : ''}`}>
        {busy ? sv.import.importing : sv.import.button}
        <span className="text-faint">
          <ChevronRightIcon />
        </span>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(e) => void pick(e.currentTarget)}
        />
      </label>
      {result && (
        <div role="status" className="px-5 pb-3 text-sm text-muted">
          {result.summary ? (
            <>
              <p>{sv.import.found(result.summary.count, formatDate(result.summary.from), formatDate(result.summary.to))}</p>
              <p>{sv.import.done(result.added, result.skipped)}</p>
            </>
          ) : (
            <p>{sv.import.nothingFound}</p>
          )}
          {result.errors.length > 0 && (
            <details className="mt-1">
              <summary>{sv.import.invalid(result.errors.length)}</summary>
              <ul className="mt-1 space-y-0.5 font-mono text-xs break-all">
                {result.errors.map((e) => (
                  <li key={`${e.file}:${e.line}`}>{sv.import.invalidRow(e.file, e.line, e.text)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
