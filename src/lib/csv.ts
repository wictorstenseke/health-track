import { parseDayMonth, parseLocalIso, toLocalIso } from './dates'
import { parseDecimal } from './format'
import { BUILT_IN_IDS, CHEST_ID, cleanName, isValidValue, METRIC_NAME_MAX, WEIGHT_ID, type Metric, type MetricId } from './metrics'
import { sortByTime } from './stats'

export interface CsvRow {
  /** `weight`, `chest`, `waist`, `hip`, or the name of one of the user's own types. `importRows` turns it into a metric id. */
  metric: string
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

/** Entries as export rows: a built-in metric goes by its id, an own type by its name. */
export function csvRows(entries: { metricId: MetricId; takenAt: number; value: number }[], metrics: Metric[]): CsvRow[] {
  const names = new Map(metrics.map((m) => [m.id, m.name]))
  return entries.map((e) => ({
    metric: BUILT_IN_IDS.includes(e.metricId) ? e.metricId : (names.get(e.metricId) ?? e.metricId),
    takenAt: e.takenAt,
    value: e.value,
  }))
}

/** Quoted when it holds the separator or a quote; a quote inside is doubled. */
const csvCell = (cell: string) => (/[",]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)

/** Standard CSV: `,` separator, `.` decimals, local time without offset. */
export function toCsv(rows: CsvRow[]): string {
  const lines = sortByTime(rows).map((r) => `${toLocalIso(r.takenAt)},${csvCell(r.metric)},${r.value.toFixed(1)}`)
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

/** Label → column index. */
type Columns = Record<string, number>
/** `inferred`: there was no header, so the own layout is a guess from the first row. */
type Layout = { kind: 'own'; takenAt: number; metric: number; value: number; inferred?: true } | { kind: 'legacy'; columns: Columns }

/**
 * Other words for the built-in metrics: the column headers in the per-year sheets, and our own ids in any case.
 * A Map, so that a cell like `constructor` isn't found on Object.prototype.
 */
const ALIASES = new Map<string, MetricId>([
  ['vikt', WEIGHT_ID],
  ['weight', WEIGHT_ID],
  ['bröst', CHEST_ID],
  ['chest', CHEST_ID],
  ['midja', 'waist'],
  ['waist', 'waist'],
  ['höft', 'hip'],
  ['hip', 'hip'],
])
const LEGACY_DEFAULT: Columns = { [WEIGHT_ID]: 1 }

/** A `metric` cell as a label: an alias becomes the built-in id, anything else is the name of an own type. */
function labelOf(cell: string): string {
  const name = cleanName(cell)
  return ALIASES.get(name.toLocaleLowerCase('sv')) ?? name
}

function layoutFromHeader(header: string[]): Layout {
  const lower = header.map((h) => h.toLowerCase())
  const metric = lower.indexOf('metric')
  if (metric === -1) return { kind: 'legacy', columns: legacyColumns(lower) }
  return { kind: 'own', takenAt: lower.indexOf('takenat'), metric, value: lower.indexOf('value') }
}

function legacyColumns(lower: string[]): Columns {
  const columns: Columns = {}
  lower.forEach((h, i) => {
    const metric = ALIASES.get(h)
    if (i > 0 && metric) columns[metric] = i
  })
  return Object.keys(columns).length > 0 ? columns : LEGACY_DEFAULT
}

export interface ParseOptions {
  /** Year for `D/M` dates; Numbers exports per-year sheets without one. */
  year?: number
}

/**
 * Accepts our own export (`takenAt,metric,value`) and legacy per-year sheets (date first, then
 * Vikt/Bröst/Midja/Höft by header, or weight in column 2 without one). Separator `,` `;` or tab; decimal `.` or `,`.
 * Knows nothing about the stored types: a row's `metric` is a label for `importRows` to resolve.
 */
export function parseCsv(text: string, { year }: ParseOptions = {}): CsvParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const firstContent = lines.find((l) => l.trim() !== '') ?? ''
  const delimiter = detectDelimiter(firstContent)
  const parseDate = (cell: string) => parseLocalIso(cell) ?? (year === undefined ? null : parseDayMonth(cell, year))
  const rows: CsvRow[] = []
  const errors: CsvError[] = []
  const lastMeasure = new Map<string, number>()
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
      // Without a header: our own format has a name second and its value third; a sheet has the weight second.
      const own = cells.length >= 3 && cells[1] !== '' && parseDecimal(cells[1]) === null && parseDecimal(cells[2]) !== null
      layout = own ? { kind: 'own', takenAt: 0, metric: 1, value: 2, inferred: true } : { kind: 'legacy', columns: LEGACY_DEFAULT }
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
      // Sheets repeat the last chest/waist/hip measurement on every row; only a changed value is a new one.
      if (row.metric !== WEIGHT_ID && lastMeasure.get(row.metric) === row.value) continue
      lastMeasure.set(row.metric, row.value)
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
  // A number where the name goes means the guess was wrong: it is a sheet, and its weights must not become types.
  if (layout.inferred && parseDecimal(metricCell) !== null) return null
  const takenAt = parseLocalIso(dateCell)
  const value = parseDecimal(valueCell)
  const metric = labelOf(metricCell)
  if (takenAt === null || value === null || metric === '' || metric.length > METRIC_NAME_MAX || !isValidValue(metric, value)) return null
  return { metric, takenAt, value }
}

/** One reading per filled metric column; null if the date or any filled cell is invalid, or nothing is filled. */
function parseLegacyRow(cells: string[], columns: Columns, takenAt: number | null): CsvRow[] | null {
  if (takenAt === null) return null
  const rows: CsvRow[] = []
  for (const [metric, index] of Object.entries(columns)) {
    const cell = cells[index] ?? ''
    if (cell === '') continue
    const value = parseDecimal(cell)
    if (value === null || !isValidValue(metric, value)) return null
    rows.push({ metric, takenAt, value })
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
