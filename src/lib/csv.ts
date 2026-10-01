import { parseLocalIso, toLocalIso } from './dates'
import { parseDecimal } from './format'
import { isMetricId, isValidValue, type MetricId } from './metrics'
import { sortByTime } from './stats'

export interface CsvRow {
  metricId: MetricId
  takenAt: number
  value: number
}

export interface CsvError {
  /** 1-based line number in the file */
  line: number
  text: string
}

export interface CsvParseResult {
  rows: CsvRow[]
  errors: CsvError[]
}

export const CSV_HEADER = 'takenAt,metric,value'

/** Standard CSV: `,` separator, `.` decimals, local time without offset. */
export function toCsv(entries: CsvRow[]): string {
  const lines = sortByTime(entries).map((e) => `${toLocalIso(e.takenAt)},${e.metricId},${e.value.toFixed(1)}`)
  return [CSV_HEADER, ...lines].join('\n') + '\n'
}

function detectDelimiter(line: string): string {
  if (line.includes(';')) return ';'
  if (line.includes('\t')) return '\t'
  return ','
}

/** Splits one line, honouring double quotes ("82,4" stays one cell; "" is an escaped quote). */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) {
      cells.push(cell.trim())
      cell = ''
    } else cell += ch
  }
  cells.push(cell.trim())
  return cells
}

type Layout = { kind: 'own'; takenAt: number; metric: number; value: number } | { kind: 'legacy' }

function layoutFromHeader(header: string[]): Layout {
  const lower = header.map((h) => h.toLowerCase())
  const metric = lower.indexOf('metric')
  if (metric === -1) return { kind: 'legacy' }
  return { kind: 'own', takenAt: lower.indexOf('takenat'), metric, value: lower.indexOf('value') }
}

/**
 * Accepts our own export (`takenAt,metric,value`) and legacy per-year sheets (`date,weight`,
 * first two columns, header optional). Separator `,` `;` or tab; decimal `.` or `,`.
 */
export function parseCsv(text: string): CsvParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const firstContent = lines.find((l) => l.trim() !== '') ?? ''
  const delimiter = detectDelimiter(firstContent)
  const rows: CsvRow[] = []
  const errors: CsvError[] = []
  let layout: Layout | null = null

  lines.forEach((raw, i) => {
    const cells = splitLine(raw, delimiter)
    if (cells.every((c) => c === '')) return

    if (layout === null) {
      const isHeader = parseLocalIso(cells[0]) === null
      if (isHeader) {
        layout = layoutFromHeader(cells)
        return
      }
      layout = cells.length >= 3 && isMetricId(cells[1]) ? { kind: 'own', takenAt: 0, metric: 1, value: 2 } : { kind: 'legacy' }
    }

    const row = parseRow(cells, layout)
    if (row) rows.push(row)
    else errors.push({ line: i + 1, text: raw })
  })

  return { rows, errors }
}

function parseRow(cells: string[], layout: Layout): CsvRow | null {
  const [dateCell, metricCell, valueCell] =
    layout.kind === 'own' ? [cells[layout.takenAt], cells[layout.metric], cells[layout.value]] : [cells[0], 'weight', cells[1]]
  if (dateCell === undefined || metricCell === undefined || valueCell === undefined) return null
  const takenAt = parseLocalIso(dateCell)
  const value = parseDecimal(valueCell)
  if (takenAt === null || value === null || !isMetricId(metricCell) || !isValidValue(metricCell, value)) return null
  return { metricId: metricCell, takenAt, value }
}

export interface CsvSummary {
  count: number
  from: number
  to: number
}

export function summarize(rows: CsvRow[]): CsvSummary | null {
  if (rows.length === 0) return null
  const times = rows.map((r) => r.takenAt)
  return { count: rows.length, from: Math.min(...times), to: Math.max(...times) }
}
