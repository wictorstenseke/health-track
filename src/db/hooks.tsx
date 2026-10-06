import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { sortMetrics, WEIGHT_ID, type Entry, type Metric, type MetricId } from '../lib/metrics'
import { db } from './db'
import { getAllEntries } from './entries'
import { getMetrics } from './metrics'
import { getProfile, type Profile } from './settings'

interface Data {
  /** All metrics, oldest first. */
  entries: Entry[]
  /** The measurement types on Mått, A–Ö. */
  metrics: Metric[]
}

const DataContext = createContext<Data | null>(null)

/** One transaction, so a screen never gets a type without its entries, or entries without their type. */
const loadData = (): Promise<Data> =>
  db.transaction('r', db.entries, db.metrics, async () => ({ entries: await getAllEntries(), metrics: sortMetrics(await getMetrics()) }))

/**
 * One live query for every entry and type, kept in memory for all screens. The data set is small, and this way
 * a screen renders with its data on the first frame instead of waiting for IndexedDB each time it mounts.
 * Renders nothing until the first load.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const data = useLiveQuery(loadData)
  if (!data) return null
  return <DataContext value={data}>{children}</DataContext>
}

function useData(): Data {
  const data = useContext(DataContext)
  if (!data) throw new Error('Reading entries or types needs a DataProvider')
  return data
}

/** All metrics, oldest first. */
export function useAllEntries(): Entry[] {
  return useData().entries
}

/** One metric, oldest first. */
export function useEntries(metricId: MetricId): Entry[] {
  const all = useAllEntries()
  return useMemo(() => all.filter((e) => e.metricId === metricId), [all, metricId])
}

/** The measurement types on Mått, A–Ö. */
export function useMetrics(): Metric[] {
  return useData().metrics
}

/** What a metric is called: Vikt, or the type's own name. */
export function useMetricName(metricId: MetricId): string {
  const metrics = useMetrics()
  return metricId === WEIGHT_ID ? sv.metrics.weight : (metrics.find((m) => m.id === metricId)?.name ?? '')
}

/** `undefined` while loading. */
export function useProfile(): Profile | undefined {
  return useLiveQuery(getProfile)
}
