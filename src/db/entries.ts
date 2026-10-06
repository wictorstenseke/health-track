import { Dexie } from 'dexie'
import type { CsvRow } from '../lib/csv'
import { newId } from '../lib/id'
import { defaultMetrics, resolveLabel, roundValue, type Entry, type Metric, type MetricId } from '../lib/metrics'
import { latestOnDay } from '../lib/stats'
import { db } from './db'

function makeEntry(metricId: MetricId, value: number, takenAt: number, now = Date.now()): Entry {
  return { id: newId(), metricId, value: roundValue(value), takenAt, createdAt: now, updatedAt: now }
}

export async function addEntry(metricId: MetricId, value: number, takenAt: number): Promise<Entry> {
  const entry = makeEntry(metricId, value, takenAt)
  await db.entries.add(entry)
  return entry
}

/** Several metrics measured at the same moment (the Mät form). */
export async function addEntries(items: { metricId: MetricId; value: number }[], takenAt: number): Promise<Entry[]> {
  const now = Date.now()
  const entries = items.map((i) => makeEntry(i.metricId, i.value, takenAt, now))
  await db.entries.bulkAdd(entries)
  return entries
}

export async function updateEntry(id: string, changes: { value: number; takenAt: number }): Promise<void> {
  await db.entries.update(id, { value: roundValue(changes.value), takenAt: changes.takenAt, updatedAt: Date.now() })
}

/** Hem keeps one weight per day: saving again replaces that day's newest weight. */
export async function saveWeightForDay(value: number, takenAt: number): Promise<void> {
  await db.transaction('rw', db.entries, async () => {
    const sameDay = latestOnDay(await getEntries('weight'), takenAt)
    if (sameDay) await updateEntry(sameDay.id, { value, takenAt })
    else await addEntry('weight', value, takenAt)
  })
}

/** Returns the deleted entry so the caller can offer undo. */
export async function deleteEntry(id: string): Promise<Entry | undefined> {
  return db.transaction('rw', db.entries, async () => {
    const entry = await db.entries.get(id)
    if (entry) await db.entries.delete(id)
    return entry
  })
}

export async function restoreEntry(entry: Entry): Promise<void> {
  await db.entries.put(entry)
}

/** One metric, oldest first. */
export async function getEntries(metricId: MetricId): Promise<Entry[]> {
  return db.entries.where('[metricId+takenAt]').between([metricId, Dexie.minKey], [metricId, Dexie.maxKey]).toArray()
}

/** All metrics, oldest first. */
export async function getAllEntries(): Promise<Entry[]> {
  return db.entries.orderBy('takenAt').toArray()
}

/** Minute precision: CSV export writes HH:mm, so re-importing our own export must match entries saved with seconds. */
const identity = (e: { metricId: string; takenAt: number; value: number }) =>
  `${e.metricId}|${Math.floor(e.takenAt / 60_000)}|${roundValue(e.value)}`

/**
 * Adds CSV rows, skipping any row identical to an existing entry (or an earlier row), so re-import is safe.
 * A row names its metric by a label; a type that isn't stored yet is created along the way.
 */
export async function importRows(rows: CsvRow[]): Promise<{ added: number; skipped: number }> {
  return db.transaction('rw', db.entries, db.metrics, async () => {
    const metrics = await db.metrics.toArray()
    const created: Metric[] = []
    const seen = new Set((await db.entries.toArray()).map(identity))
    const now = Date.now()
    const toAdd: Entry[] = []
    for (const row of rows) {
      const resolved = resolveLabel(row.metric, metrics)
      if (resolved.create !== undefined) {
        const metric: Metric = { id: resolved.id, name: resolved.create, createdAt: now }
        created.push(metric)
        // Into the list at once, so the next row with this label finds it instead of creating it again.
        metrics.push(metric)
      }
      const key = identity({ metricId: resolved.id, takenAt: row.takenAt, value: row.value })
      if (seen.has(key)) continue
      seen.add(key)
      toAdd.push(makeEntry(resolved.id, row.value, row.takenAt, now))
    }
    await db.metrics.bulkAdd(created)
    await db.entries.bulkAdd(toAdd)
    return { added: toAdd.length, skipped: rows.length - toAdd.length }
  })
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.entries, db.settings, db.metrics, async () => {
    await db.entries.clear()
    await db.settings.clear()
    await db.metrics.clear()
    await db.metrics.bulkAdd(defaultMetrics())
  })
}
