import { Dexie } from 'dexie'
import type { CsvRow } from '../lib/csv'
import { newId } from '../lib/id'
import { roundValue, type Entry, type MetricId } from '../lib/metrics'
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

const identity = (e: { metricId: string; takenAt: number; value: number }) => `${e.metricId}|${e.takenAt}|${roundValue(e.value)}`

/** Adds CSV rows, skipping any row identical to an existing entry (or an earlier row), so re-import is safe. */
export async function importRows(rows: CsvRow[]): Promise<{ added: number; skipped: number }> {
  return db.transaction('rw', db.entries, async () => {
    const seen = new Set((await db.entries.toArray()).map(identity))
    const now = Date.now()
    const toAdd: Entry[] = []
    for (const row of rows) {
      const key = identity(row)
      if (seen.has(key)) continue
      seen.add(key)
      toAdd.push(makeEntry(row.metricId, row.value, row.takenAt, now))
    }
    await db.entries.bulkAdd(toAdd)
    return { added: toAdd.length, skipped: rows.length - toAdd.length }
  })
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.entries, db.settings, async () => {
    await db.entries.clear()
    await db.settings.clear()
  })
}
