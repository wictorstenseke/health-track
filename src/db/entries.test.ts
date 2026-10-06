import { describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addEntries, addEntry, clearAllData, deleteEntry, getAllEntries, getEntries, importRows, restoreEntry, saveWeightForDay, updateEntry,
} from './entries'
import { addMetric, deleteMetric, getMetrics } from './metrics'
import { getProfile, setName } from './settings'
import { parseCsv, toCsv } from '../lib/csv'

const at = (d: number) => new Date(2026, 8, d, 8).getTime()

describe('entries', () => {
  it('adds entries rounded to one decimal', async () => {
    const e = await addEntry('weight', 82.44, at(1))
    expect(e.value).toBe(82.4)
    expect(await db.entries.get(e.id)).toEqual(e)
  })

  it('allows several entries on the same day', async () => {
    await addEntry('weight', 82.4, at(1))
    await addEntry('weight', 82.1, at(1) + 3_600_000)
    expect(await getEntries('weight')).toHaveLength(2)
  })

  it('returns one metric oldest first', async () => {
    await addEntry('weight', 82.0, at(3))
    await addEntry('waist', 92.5, at(2))
    await addEntry('weight', 83.0, at(1))
    expect((await getEntries('weight')).map((e) => e.value)).toEqual([83.0, 82.0])
    expect((await getAllEntries()).map((e) => e.metricId)).toEqual(['weight', 'waist', 'weight'])
  })

  it('adds several metrics with one timestamp', async () => {
    const added = await addEntries([{ metricId: 'waist', value: 92.5 }, { metricId: 'hip', value: 101 }], at(5))
    expect(added.map((e) => e.takenAt)).toEqual([at(5), at(5)])
    expect(await db.entries.count()).toBe(2)
  })

  it('updates value and time', async () => {
    const e = await addEntry('weight', 82.4, at(1))
    await updateEntry(e.id, { value: 28.4 + 54, takenAt: at(2) })
    const updated = await db.entries.get(e.id)
    expect(updated?.value).toBe(82.4)
    expect(updated?.takenAt).toBe(at(2))
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(e.updatedAt)
  })

  it('saves a weight for a day without one', async () => {
    await addEntry('weight', 80, at(1))
    await saveWeightForDay(79.4, at(2))
    expect((await getEntries('weight')).map((e) => [e.value, e.takenAt])).toEqual([[80, at(1)], [79.4, at(2)]])
  })

  it("replaces the day's newest weight instead of adding a second one", async () => {
    const early = await addEntry('weight', 81, at(1) - 3_600_000)
    const newest = await addEntry('weight', 80, at(1))
    const waist = await addEntry('waist', 92, at(1))
    await saveWeightForDay(79.44, at(1) + 1_800_000)
    expect(await db.entries.get(early.id)).toEqual(early)
    expect(await db.entries.get(waist.id)).toEqual(waist)
    const replaced = await db.entries.get(newest.id)
    expect([replaced?.value, replaced?.takenAt]).toEqual([79.4, at(1) + 1_800_000])
    expect(await db.entries.count()).toBe(3)
  })

  it('deletes and restores', async () => {
    const e = await addEntry('weight', 82.4, at(1))
    const deleted = await deleteEntry(e.id)
    expect(deleted).toEqual(e)
    expect(await db.entries.count()).toBe(0)
    await restoreEntry(deleted!)
    expect(await db.entries.get(e.id)).toEqual(e)
  })

  it('imports rows and skips duplicates, also on re-import', async () => {
    await addEntry('weight', 88.2, at(1))
    const rows = [
      { metricId: 'weight' as const, takenAt: at(1), value: 88.2 },
      { metricId: 'weight' as const, takenAt: at(2), value: 87.9 },
      { metricId: 'weight' as const, takenAt: at(2), value: 87.9 },
    ]
    expect(await importRows(rows)).toEqual({ added: 1, skipped: 2 })
    expect(await importRows(rows)).toEqual({ added: 0, skipped: 3 })
    expect(await db.entries.count()).toBe(2)
  })

  it('re-importing our own export adds nothing, even for entries saved with seconds', async () => {
    await addEntry('weight', 82.4, at(1) + 23_456)
    const { rows } = parseCsv(toCsv(await getAllEntries()))
    expect(await importRows(rows)).toEqual({ added: 0, skipped: 1 })
  })

  it('restores a full backup across all metrics after wiping the data', async () => {
    // Seconds/millis, and two weights in the same minute with different values.
    await addEntry('weight', 82.4, at(1) + 23_456)
    await addEntry('weight', 82.1, at(1) + 41_789)
    await addEntry('waist', 92.5, at(2) + 7_123)
    await addEntry('hip', 101.5, at(3) + 59_999)
    const identity = (entries: Array<{ metricId: string; value: number; takenAt: number }>) =>
      entries.map((e) => [e.metricId, e.value, Math.floor(e.takenAt / 60_000)]).sort()
    const before = identity(await getAllEntries())

    const csv = toCsv(await getAllEntries())
    await clearAllData()
    const result = parseCsv(csv)
    expect(result.errors).toEqual([])
    expect(await importRows(result.rows)).toEqual({ added: 4, skipped: 0 })

    expect(identity(await getAllEntries())).toEqual(before)
  })

  it('clears everything and puts the default types back', async () => {
    await addEntry('weight', 82.4, at(1))
    await setName('Wictor')
    await addMetric('Bröst')
    await deleteMetric('hip')
    await clearAllData()
    expect(await db.entries.count()).toBe(0)
    expect((await getProfile()).name).toBe('')
    expect((await getMetrics()).map((m) => m.id).sort()).toEqual(['hip', 'waist'])
  })
})
