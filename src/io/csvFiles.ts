import { setLastExportAt } from '../db/settings'
import { getAllEntries } from '../db/entries'
import { parseCsv, toCsv, type CsvError, type CsvRow } from '../lib/csv'
import { toLocalIso } from '../lib/dates'

export interface FileCsvError extends CsvError {
  file: string
}

export interface ReadResult {
  rows: CsvRow[]
  errors: FileCsvError[]
}

export async function readCsvFiles(files: File[]): Promise<ReadResult> {
  const parsed = await Promise.all(files.map(async (f) => ({ file: f.name, result: parseCsv(await f.text()) })))
  return {
    rows: parsed.flatMap((p) => p.result.rows),
    errors: parsed.flatMap((p) => p.result.errors.map((e) => ({ ...e, file: p.file }))),
  }
}

/**
 * Share sheet on iOS ("Spara i Filer"); download elsewhere, or when sharing fails
 * (e.g. NotAllowedError once the tap's user activation has expired). Only a completed export updates "Senaste export".
 */
export async function exportCsv(now = Date.now()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const csv = toCsv(await getAllEntries())
  const filename = `vagen-${toLocalIso(now).slice(0, 10)}.csv`
  const file = new File([csv], filename, { type: 'text/csv' })

  if (navigator.canShare?.({ files: [file] })) {
    let shared = false
    try {
      await navigator.share({ files: [file] })
      shared = true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
    if (shared) {
      await setLastExportAt(now)
      return 'shared'
    }
  }

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Revoking immediately can abort the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  await setLastExportAt(now)
  return 'downloaded'
}
