import { useLiveQuery } from 'dexie-react-hooks'
import type { Entry, MetricId } from '../lib/metrics'
import { getAllEntries, getEntries } from './entries'
import { getProfile, type Profile } from './settings'

/** Live list for one metric, oldest first. `undefined` while loading. */
export function useEntries(metricId: MetricId): Entry[] | undefined {
  return useLiveQuery(() => getEntries(metricId), [metricId])
}

/** All metrics, oldest first. `undefined` while loading. */
export function useAllEntries(): Entry[] | undefined {
  return useLiveQuery(getAllEntries)
}

/** `undefined` while loading. */
export function useProfile(): Profile | undefined {
  return useLiveQuery(getProfile)
}
