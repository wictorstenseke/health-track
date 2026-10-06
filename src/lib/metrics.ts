import { sv } from '../i18n/sv'
import { newId } from './id'

export type MetricId = 'weight' | 'waist' | 'hip'
export type Unit = 'kg' | 'cm'

export interface MetricDef {
  id: MetricId
  unit: Unit
  /** Plausible range. Values outside are rejected on input and import. */
  validMin: number
  validMax: number
}

export const METRICS: Record<MetricId, MetricDef> = {
  weight: { id: 'weight', unit: 'kg', validMin: 20, validMax: 300 },
  waist: { id: 'waist', unit: 'cm', validMin: 20, validMax: 300 },
  hip: { id: 'hip', unit: 'cm', validMin: 20, validMax: 300 },
}

/** Metrics shown on the Mått tab. */
export const MEASURE_METRIC_IDS: MetricId[] = ['waist', 'hip']

/** The one fixed metric; Hem is built on it. Every other metric is a type the user can create and delete. */
export const WEIGHT_ID = 'weight'

/** A measurement type on the Mått tab: a row in the `metrics` table. Always cm. */
export interface Metric {
  id: string
  name: string
  createdAt: number
}

/** The types every install starts with. */
const DEFAULT_METRICS = [
  { id: 'waist', name: sv.metrics.waist },
  { id: 'hip', name: sv.metrics.hip },
]

export function defaultMetrics(now = Date.now()): Metric[] {
  return DEFAULT_METRICS.map((m) => ({ ...m, createdAt: now }))
}

/**
 * What the CSV export calls the built-in metrics. They are not available as names either, or a type called
 * "waist" would come back as Midja on import.
 */
export const BUILT_IN_IDS: string[] = [WEIGHT_ID, ...DEFAULT_METRICS.map((m) => m.id)]

export const unitOf = (metricId: string): Unit => (metricId === WEIGHT_ID ? 'kg' : 'cm')

export interface Entry {
  id: string
  metricId: MetricId
  /** kg or cm, rounded to 1 decimal */
  value: number
  /** epoch ms */
  takenAt: number
  createdAt: number
  updatedAt: number
}

export function isMetricId(v: string): v is MetricId {
  return Object.hasOwn(METRICS, v)
}

/** Rounds to 1 decimal. `+ 0` turns -0 into 0. */
export function roundValue(v: number): number {
  return Math.round(v * 10) / 10 + 0
}

/** Plausible range per unit. Values outside are rejected on input and import. */
const VALID_RANGE: Record<Unit, { min: number; max: number }> = { kg: { min: 20, max: 300 }, cm: { min: 1, max: 300 } }

export function isValidValue(metricId: string, v: number): boolean {
  const { min, max } = VALID_RANGE[unitOf(metricId)]
  return Number.isFinite(v) && v >= min && v <= max
}

export const METRIC_NAME_MAX = 30

/** Trimmed, with runs of whitespace as one space. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ')

/** Two names are the same when their folded forms are: case and spacing don't count. */
const fold = (name: string) => cleanName(name).toLocaleLowerCase('sv')

export type NameProblem = 'empty' | 'tooLong' | 'taken'

/** Why `name` can't be a new type's name, or null when it can. A reserved word counts as taken. */
export function nameProblem(name: string, existing: Pick<Metric, 'name'>[]): NameProblem | null {
  const clean = cleanName(name)
  if (clean === '') return 'empty'
  if (clean.length > METRIC_NAME_MAX) return 'tooLong'
  const folded = fold(clean)
  const reserved = folded === fold(sv.metrics.weight) || BUILT_IN_IDS.includes(folded)
  return reserved || existing.some((m) => fold(m.name) === folded) ? 'taken' : null
}

const collator = new Intl.Collator('sv', { sensitivity: 'base' })

/** A–Ö by name in Swedish order, ignoring case. Returns a copy. */
export function sortMetrics<T extends Pick<Metric, 'name'>>(metrics: T[]): T[] {
  return [...metrics].sort((a, b) => collator.compare(a.name, b.name))
}

/**
 * The metric a CSV label stands for. With `create` set, the type isn't stored yet and must be added under that
 * name first: an own type from another install, or a default type the user has deleted.
 */
export function resolveLabel(label: string, metrics: Metric[]): { id: string; create?: string } {
  if (label === WEIGHT_ID) return { id: WEIGHT_ID }
  const byId = metrics.find((m) => m.id === label)
  if (byId) return { id: byId.id }
  const fallback = DEFAULT_METRICS.find((m) => m.id === label)
  const name = fold(fallback?.name ?? label)
  const byName = metrics.find((m) => fold(m.name) === name)
  if (byName) return { id: byName.id }
  return fallback ? { id: fallback.id, create: fallback.name } : { id: newId(), create: cleanName(label) }
}

export const HEIGHT_MIN_CM = 100
export const HEIGHT_MAX_CM = 250

export function isValidHeight(cm: number): boolean {
  return Number.isFinite(cm) && cm >= HEIGHT_MIN_CM && cm <= HEIGHT_MAX_CM
}
