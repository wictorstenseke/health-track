import { parseDayMonth, parseLocalIso, toLocalIso } from './dates'
import { parseDecimal } from './format'
import { BUILT_IN_IDS, isValidValue, type MetricId } from './metrics'
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

type Columns = Partial<Record<MetricId, number>>
type Layout = { kind: 'own'; takenAt: number; metric: number; value: number } | { kind: 'legacy'; columns: Columns }

/** Column headers in the per-year sheets. */
const LEGACY_HEADERS: Record<string, MetricId> = { vikt: 'weight', midja: 'waist', höft: 'hip', weight: 'weight', waist: 'waist', hip: 'hip' }
const LEGACY_DEFAULT: Columns = { weight: 1 }

function layoutFromHeader(header: string[]): Layout {
  const lower = header.map((h) => h.toLowerCase())
  const metric = lower.indexOf('metric')
  if (metric === -1) return { kind: 'legacy', columns: legacyColumns(lower) }
  return { kind: 'own', takenAt: lower.indexOf('takenat'), metric, value: lower.indexOf('value') }
}

function legacyColumns(lower: string[]): Columns {
  const columns: Columns = {}
  lower.forEach((h, i) => {
    const metricId = LEGACY_HEADERS[h]
    if (i > 0 && metricId) columns[metricId] = i
  })
  return Object.keys(columns).length > 0 ? columns : LEGACY_DEFAULT
}

export interface ParseOptions {
  /** Year for `D/M` dates; Numbers exports per-year sheets without one. */
  year?: number
}

/**
 * Accepts our own export (`takenAt,metric,value`) and legacy per-year sheets (date first, then
 * Vikt/Midja/Höft by header, or weight in column 2 without one). Separator `,` `;` or tab; decimal `.` or `,`.
 */
export function parseCsv(text: string, { year }: ParseOptions = {}): CsvParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const firstContent = lines.find((l) => l.trim() !== '') ?? ''
  const delimiter = detectDelimiter(firstContent)
  const parseDate = (cell: string) => parseLocalIso(cell) ?? (year === undefined ? null : parseDayMonth(cell, year))
  const rows: CsvRow[] = []
  const errors: CsvError[] = []
  const lastMeasure: Partial<Record<MetricId, number>> = {}
  let layout: Layout | null = null

  lines.forEach((raw, i) => {
    const cells = splitLine(raw, delimiter)
    if (cells.every((c) => c === '')) return

    if (layout === null) {
      const isHeader = parseDate(cells[0]) === null
      if (isHeader) {
        layout = layoutFromHeader(cells)
        return
      }
      layout =
        cells.length >= 3 && BUILT_IN_IDS.includes(cells[1]) ? { kind: 'own', takenAt: 0, metric: 1, value: 2 } : { kind: 'legacy', columns: LEGACY_DEFAULT }
    }

    if (layout.kind === 'own') {
      const row = parseOwnRow(cells, layout)
      if (row) rows.push(row)
      else errors.push({ line: i + 1, text: raw })
      return
    }

    const sheetRows = parseLegacyRow(delimiter === ',' ? mergeDecimalComma(cells) : cells, layout.columns, parseDate(cells[0]))
    if (!sheetRows) {
      errors.push({ line: i + 1, text: raw })
      return
    }
    for (const row of sheetRows) {
      // Sheets repeat the last waist/hip measurement on every row; only a changed value is a new one.
      if (row.metricId !== 'weight' && lastMeasure[row.metricId] === row.value) continue
      lastMeasure[row.metricId] = row.value
      rows.push(row)
    }
  })

  return { rows, errors }
}

/**
 * A comma-delimited legacy sheet with an unquoted decimal comma (`2024-01-03,82,4`) splits the value
 * into two cells; without this the weight would silently read as 82.
 */
function mergeDecimalComma(cells: string[]): string[] {
  if (/^\d+$/.test(cells[1] ?? '') && /^\d{1,2}$/.test(cells[2] ?? '')) return [cells[0], `${cells[1]},${cells[2]}`, ...cells.slice(3)]
  return cells
}

function parseOwnRow(cells: string[], layout: Extract<Layout, { kind: 'own' }>): CsvRow | null {
  const [dateCell, metricCell, valueCell] = [cells[layout.takenAt], cells[layout.metric], cells[layout.value]]
  if (dateCell === undefined || metricCell === undefined || valueCell === undefined) return null
  const takenAt = parseLocalIso(dateCell)
  const value = parseDecimal(valueCell)
  if (takenAt === null || value === null || !BUILT_IN_IDS.includes(metricCell) || !isValidValue(metricCell, value)) return null
  return { metricId: metricCell, takenAt, value }
}

/** One reading per filled metric column; null if the date or any filled cell is invalid, or nothing is filled. */
function parseLegacyRow(cells: string[], columns: Columns, takenAt: number | null): CsvRow[] | null {
  if (takenAt === null) return null
  const rows: CsvRow[] = []
  for (const [metricId, index] of Object.entries(columns) as [MetricId, number][]) {
    const cell = cells[index] ?? ''
    if (cell === '') continue
    const value = parseDecimal(cell)
    if (value === null || !isValidValue(metricId, value)) return null
    rows.push({ metricId, takenAt, value })
  }
  return rows.length > 0 ? rows : null
}

/** Four-digit year in a per-year sheet's file name, e.g. `2024-År 2024 tracking.csv`. */
export function yearFromFileName(name: string): number | undefined {
  const m = name.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/)
  return m ? Number(m[0]) : undefined
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
