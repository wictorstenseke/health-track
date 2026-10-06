import { describe, expect, it } from 'vitest'
import { csvRows, parseCsv, summarize, toCsv, yearFromFileName } from './csv'

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime()

describe('toCsv', () => {
  it('writes header + rows sorted by time with dot decimals', () => {
    const csv = toCsv([
      { metric: 'waist', takenAt: at(2026, 9, 28, 7, 10), value: 92.5 },
      { metric: 'weight', takenAt: at(2026, 10, 1, 7, 32), value: 82 },
    ])
    expect(csv).toBe('takenAt,metric,value\n2026-09-28T07:10,waist,92.5\n2026-10-01T07:32,weight,82.0\n')
  })
  it('quotes a name with a comma or a quote in it', () => {
    const csv = toCsv([
      { metric: 'Lår, vänster', takenAt: at(2026, 10, 1, 7, 32), value: 55 },
      { metric: 'Arm "biceps"', takenAt: at(2026, 10, 2, 7, 32), value: 35 },
    ])
    expect(csv).toBe('takenAt,metric,value\n2026-10-01T07:32,"Lår, vänster",55.0\n2026-10-02T07:32,"Arm ""biceps""",35.0\n')
  })
})

describe('csvRows', () => {
  const metrics = [
    { id: 'waist', name: 'Midja', createdAt: 0 },
    { id: 'abc', name: 'Bröst', createdAt: 0 },
  ]

  it('labels a built-in metric by its id and an own type by its name', () => {
    const rows = csvRows(
      [
        { metricId: 'weight', takenAt: 1, value: 82.4 },
        { metricId: 'waist', takenAt: 2, value: 92.5 },
        { metricId: 'abc', takenAt: 3, value: 104 },
      ],
      metrics,
    )
    expect(rows.map((r) => r.metric)).toEqual(['weight', 'waist', 'Bröst'])
  })
  it('keeps only the fields the file has columns for', () => {
    const entry = { id: 'e1', metricId: 'weight', takenAt: 1, value: 82.4, createdAt: 1, updatedAt: 1 }
    expect(csvRows([entry], metrics)).toEqual([{ metric: 'weight', takenAt: 1, value: 82.4 }])
  })
})

describe('parseCsv — own format', () => {
  it('round-trips an export', () => {
    const rows = [
      { metric: 'weight', takenAt: at(2026, 10, 1, 7, 32), value: 82.4 },
      { metric: 'hip', takenAt: at(2026, 9, 28, 7, 10), value: 101.5 },
    ]
    const result = parseCsv(toCsv(rows))
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([rows[1], rows[0]])
  })
  it('works without a header', () => {
    expect(parseCsv('2026-10-01T07:32,weight,82.4').rows).toEqual([{ metric: 'weight', takenAt: at(2026, 10, 1, 7, 32), value: 82.4 }])
  })
  it('reads the name of an own type, with or without a header', () => {
    const row = { metric: 'Bröst', takenAt: at(2026, 10, 1, 7, 32), value: 104.5 }
    expect(parseCsv('takenAt,metric,value\n2026-10-01T07:32,Bröst,104.5\n')).toEqual({ rows: [row], errors: [] })
    expect(parseCsv('2026-10-01T07:32,Bröst,104.5').rows).toEqual([row])
  })
  it('round-trips names with a comma or a quote', () => {
    const rows = [
      { metric: 'Lår, vänster', takenAt: at(2026, 10, 1, 7, 32), value: 55 },
      { metric: 'Arm "biceps"', takenAt: at(2026, 10, 2, 7, 32), value: 35 },
    ]
    expect(parseCsv(toCsv(rows))).toEqual({ rows, errors: [] })
  })
  it('reads a built-in metric under any of its names, in any case', () => {
    const csv = 'takenAt,metric,value\n2026-10-01T07:32,Vikt,82.4\n2026-10-01T07:33,MIDJA,92.5\n2026-10-01T07:34,Hip,101\n'
    expect(parseCsv(csv).rows.map((r) => r.metric)).toEqual(['weight', 'waist', 'hip'])
  })
  it('checks a value against the range of its kind', () => {
    const csv = 'takenAt,metric,value\n2026-10-01T07:32,Handled,16.5\n2026-10-01T07:33,weight,16.5\n2026-10-01T07:34,Handled,0.5\n'
    const result = parseCsv(csv)
    expect(result.rows).toEqual([{ metric: 'Handled', takenAt: at(2026, 10, 1, 7, 32), value: 16.5 }])
    expect(result.errors.map((e) => e.line)).toEqual([3, 4])
  })
  it('rejects an empty name and one over 30 characters', () => {
    const result = parseCsv(`takenAt,metric,value\n2026-10-01T07:32,,50\n2026-10-01T07:33,${'a'.repeat(31)},50\n`)
    expect(result.rows).toEqual([])
    expect(result.errors.map((e) => e.line)).toEqual([2, 3])
  })
  it('takes a name that is also an Object property as a plain name', () => {
    const csv = 'takenAt,metric,value\n2026-10-01T07:32,toString,50\n2026-10-01T07:33,constructor,50\n'
    expect(parseCsv(csv).rows.map((r) => r.metric)).toEqual(['toString', 'constructor'])
  })
})

describe('parseCsv — legacy per-year sheets', () => {
  it('reads Swedish semicolon + decimal comma with header', () => {
    const result = parseCsv('﻿Datum;Vikt\r\n2024-01-03;88,2\r\n2024-01-10;87,9\r\n;\r\n')
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { metric: 'weight', takenAt: at(2024, 1, 3), value: 88.2 },
      { metric: 'weight', takenAt: at(2024, 1, 10), value: 87.9 },
    ])
  })
  it('reads comma-separated with quoted decimal comma and no header', () => {
    expect(parseCsv('2024-01-03,"88,2"\n').rows).toEqual([{ metric: 'weight', takenAt: at(2024, 1, 3), value: 88.2 }])
  })
  it('ignores extra columns', () => {
    expect(parseCsv('2024-01-03;88,2;bra dag').rows).toHaveLength(1)
  })
  it('ignores a column whose header is also an Object property', () => {
    expect(parseCsv('Datum;Vikt;constructor\n2024-01-03;82;5\n')).toEqual({
      rows: [{ metric: 'weight', takenAt: at(2024, 1, 3), value: 82 }],
      errors: [],
    })
  })
  it('merges an unquoted decimal comma in a comma-delimited file', () => {
    const result = parseCsv('Datum,Vikt\n2024-01-03,82,4\n')
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([{ metric: 'weight', takenAt: at(2024, 1, 3), value: 82.4 }])
  })
  it('keeps a second decimal digit from a merged comma (rounding happens on write)', () => {
    expect(parseCsv('2024-01-03,82,45\n').rows).toEqual([{ metric: 'weight', takenAt: at(2024, 1, 3), value: 82.45 }])
  })
  it('leaves an integer weight alone', () => {
    expect(parseCsv('2024-01-03,82\n').rows).toEqual([{ metric: 'weight', takenAt: at(2024, 1, 3), value: 82 }])
  })
  it('reports invalid rows with 1-based line numbers', () => {
    const result = parseCsv('Datum;Vikt\n2024-01-03;88,2\n2024-13-01;88\n2024-01-05;abc\n2024-01-06;5\n')
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toEqual([
      { line: 3, text: '2024-13-01;88' },
      { line: 4, text: '2024-01-05;abc' },
      { line: 5, text: '2024-01-06;5' },
    ])
  })
})

describe('parseCsv — Numbers export (day/month dates, year from file name)', () => {
  const sheet = [
    'Datum;Vikt;Diff per mån;;Bröst;Midja',
    '2/1;84,2 kg;;;101 cm;102 cm',
    '8/1;81,7 kg;;;100,4 cm;100,3 cm',
    '10/1;81,6 kg;;;100,4 cm;100,3 cm',
    '23/1;78,3 kg;Jan;−5,9 kg;98,8 cm;97 cm',
    '14/12;67,9 kg;;;;',
  ].join('\r\n')

  it('reads day/month dates in the given year', () => {
    const { rows, errors } = parseCsv(sheet, { year: 2024 })
    expect(errors).toEqual([])
    expect(rows.filter((r) => r.metric === 'weight')).toEqual([
      { metric: 'weight', takenAt: at(2024, 1, 2), value: 84.2 },
      { metric: 'weight', takenAt: at(2024, 1, 8), value: 81.7 },
      { metric: 'weight', takenAt: at(2024, 1, 10), value: 81.6 },
      { metric: 'weight', takenAt: at(2024, 1, 23), value: 78.3 },
      { metric: 'weight', takenAt: at(2024, 12, 14), value: 67.9 },
    ])
  })
  it('imports Midja as waist, skipping values carried forward from the row above', () => {
    expect(parseCsv(sheet, { year: 2024 }).rows.filter((r) => r.metric === 'waist')).toEqual([
      { metric: 'waist', takenAt: at(2024, 1, 2), value: 102 },
      { metric: 'waist', takenAt: at(2024, 1, 8), value: 100.3 },
      { metric: 'waist', takenAt: at(2024, 1, 23), value: 97 },
    ])
  })
  it('imports Höft as hip', () => {
    expect(parseCsv('Datum;Vikt;Höft\n2024-01-03;;101,5\n').rows).toEqual([{ metric: 'hip', takenAt: at(2024, 1, 3), value: 101.5 }])
  })
  it('rejects day/month dates when the year is unknown', () => {
    expect(parseCsv(sheet).rows).toEqual([])
  })
  it('treats a day/month first line as data, not a header', () => {
    expect(parseCsv('2/1;84,2 kg\n', { year: 2024 }).rows).toEqual([{ metric: 'weight', takenAt: at(2024, 1, 2), value: 84.2 }])
  })
  it('reports a row whose measurement is invalid', () => {
    expect(parseCsv('Datum;Vikt;Midja\n2024-01-03;82;abc\n2024-01-04;;\n').errors).toEqual([
      { line: 2, text: '2024-01-03;82;abc' },
      { line: 3, text: '2024-01-04;;' },
    ])
  })
})

describe('yearFromFileName', () => {
  it('finds a four-digit year', () => {
    expect(yearFromFileName('2024-År 2024 tracking.csv')).toBe(2024)
    expect(yearFromFileName('vikt 2025.csv')).toBe(2025)
  })
  it('returns undefined without one', () => {
    expect(yearFromFileName('vikt.csv')).toBeUndefined()
    expect(yearFromFileName('export-12024.csv')).toBeUndefined()
  })
})

describe('summarize', () => {
  it('returns count and date range', () => {
    const { rows } = parseCsv('2024-01-10;87,9\n2024-01-03;88,2\n')
    expect(summarize(rows)).toEqual({ count: 2, from: at(2024, 1, 3), to: at(2024, 1, 10) })
    expect(summarize([])).toBeNull()
  })
})
