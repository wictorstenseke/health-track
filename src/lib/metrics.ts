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

export function isValidValue(metricId: MetricId, v: number): boolean {
  const def = METRICS[metricId]
  return Number.isFinite(v) && v >= def.validMin && v <= def.validMax
}

export const HEIGHT_MIN_CM = 100
export const HEIGHT_MAX_CM = 250

export function isValidHeight(cm: number): boolean {
  return Number.isFinite(cm) && cm >= HEIGHT_MIN_CM && cm <= HEIGHT_MAX_CM
}
