import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProfile } from '../db/settings'
import { toCsv, type CsvRow } from '../lib/csv'
import { exportCsv, readCsvFiles } from './csvFiles'

describe('readCsvFiles', () => {
  it('merges rows and tags errors with the file name', async () => {
    const result = await readCsvFiles([
      new File(['Datum;Vikt\n2024-01-03;88,2\n'], '2024.csv'),
      new File(['Datum;Vikt\n2025-01-03;86,0\nfel;rad\n'], '2025.csv'),
    ])
    expect(result.rows.map((r) => r.value)).toEqual([88.2, 86.0])
    expect(result.errors).toEqual([{ file: '2025.csv', line: 3, text: 'fel;rad' }])
  })
})

describe('exportCsv', () => {
  afterEach(() => vi.unstubAllGlobals())

  const rows: CsvRow[] = [{ metricId: 'weight', takenAt: new Date(2026, 9, 1, 7, 32).getTime(), value: 82.4 }]
  const now = new Date(2026, 9, 1, 9, 0).getTime()

  it('calls the share sheet synchronously so iOS keeps the tap activation', async () => {
    const share = vi.fn((_data: ShareData) => Promise.resolve())
    vi.stubGlobal('navigator', { canShare: () => true, share })

    const done = exportCsv(rows, now)
    expect(share).toHaveBeenCalledTimes(1)

    expect(await done).toBe('shared')
    const file = share.mock.calls[0][0].files?.[0]
    expect(file?.name).toBe('vagen-2026-10-01.csv')
    expect(await file?.text()).toBe(toCsv(rows))
    expect((await getProfile()).lastExportAt).toBe(now)
  })

  it('reports a cancelled share without updating the last export time', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('x', 'AbortError')))
    vi.stubGlobal('navigator', { canShare: () => true, share })

    expect(await exportCsv(rows, now)).toBe('cancelled')
    expect((await getProfile()).lastExportAt).toBeNull()
  })
})
