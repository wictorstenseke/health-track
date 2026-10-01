import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Entry, MetricId } from '../lib/metrics'
import { getAllEntries } from './entries'
import { getProfile, type Profile } from './settings'

const EntriesContext = createContext<Entry[] | null>(null)

/**
 * One live query for every entry, kept in memory for all screens. The data set is small, and this way a
 * screen renders with its data on the first frame instead of waiting for IndexedDB each time it mounts.
 * Renders nothing until the first load.
 */
export function EntriesProvider({ children }: { children: ReactNode }) {
  const entries = useLiveQuery(getAllEntries)
  if (!entries) return null
  return <EntriesContext value={entries}>{children}</EntriesContext>
}

/** All metrics, oldest first. */
export function useAllEntries(): Entry[] {
  const entries = useContext(EntriesContext)
  if (!entries) throw new Error('useAllEntries needs an EntriesProvider')
  return entries
}

/** One metric, oldest first. */
export function useEntries(metricId: MetricId): Entry[] {
  const all = useAllEntries()
  return useMemo(() => all.filter((e) => e.metricId === metricId), [all, metricId])
}

/** `undefined` while loading. */
export function useProfile(): Profile | undefined {
  return useLiveQuery(getProfile)
}
