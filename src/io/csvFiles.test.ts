import { describe, expect, it } from 'vitest'
import { readCsvFiles } from './csvFiles'

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
