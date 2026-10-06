import { describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addEntries, addEntry, clearAllData, deleteEntry, getAllEntries, getEntries, importRows, restoreEntry, saveWeightForDay, updateEntry,
} from './entries'
import { addMetric, deleteMetric, getMetrics } from './metrics'
import { getProfile, setName } from './settings'
import { csvRows, parseCsv, toCsv } from '../lib/csv'

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
      { metric: 'weight', takenAt: at(1), value: 88.2 },
      { metric: 'weight', takenAt: at(2), value: 87.9 },
      { metric: 'weight', takenAt: at(2), value: 87.9 },
    ]
    expect(await importRows(rows)).toEqual({ added: 1, skipped: 2 })
    expect(await importRows(rows)).toEqual({ added: 0, skipped: 3 })
    expect(await db.entries.count()).toBe(2)
  })

  it('re-importing our own export adds nothing, even for entries saved with seconds', async () => {
    await addEntry('weight', 82.4, at(1) + 23_456)
    const { rows } = parseCsv(toCsv(csvRows(await getAllEntries(), await getMetrics())))
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

    const csv = toCsv(csvRows(await getAllEntries(), await getMetrics()))
    await clearAllData()
    const result = parseCsv(csv)
    expect(result.errors).toEqual([])
    expect(await importRows(result.rows)).toEqual({ added: 4, skipped: 0 })

    expect(identity(await getAllEntries())).toEqual(before)
  })

  it('imports an own type by its name and creates it once, whatever the case', async () => {
    const rows = [
      { metric: 'Lår', takenAt: at(1), value: 55.5 },
      { metric: 'lår', takenAt: at(2), value: 55 },
      { metric: 'LÅR', takenAt: at(3), value: 54.5 },
    ]
    expect(await importRows(rows)).toEqual({ added: 3, skipped: 0 })
    const thigh = (await getMetrics()).filter((m) => m.name.toLowerCase() === 'lår')
    expect(thigh.map((m) => m.name)).toEqual(['Lår'])
    expect((await getEntries(thigh[0].id)).map((e) => e.value)).toEqual([55.5, 55, 54.5])
  })

  it('imports into a type that already has that name', async () => {
    const thigh = await addMetric('Lår')
    await importRows([{ metric: 'lår', takenAt: at(1), value: 55.5 }])
    expect(await db.metrics.count()).toBe(4)
    expect(await getEntries(thigh.id)).toHaveLength(1)
  })

  it("imports a sheet's Bröst column into the default type", async () => {
    await importRows([{ metric: 'chest', takenAt: at(1), value: 101 }])
    expect(await db.metrics.count()).toBe(3)
    expect((await getEntries('chest')).map((e) => e.value)).toEqual([101])
  })

  it("imports a sheet's Bröst column into the Bröst the user made themselves", async () => {
    await deleteMetric('chest')
    const own = await addMetric('Bröst')
    await importRows([{ metric: 'chest', takenAt: at(1), value: 101 }])
    expect(await db.metrics.get('chest')).toBeUndefined()
    expect((await getEntries(own.id)).map((e) => e.value)).toEqual([101])
  })

  it('brings back a deleted default type when a file has it', async () => {
    await deleteMetric('waist')
    await importRows([{ metric: 'waist', takenAt: at(1), value: 92.5 }])
    expect(await db.metrics.get('waist')).toMatchObject({ id: 'waist', name: 'Midja' })
    expect(await getEntries('waist')).toHaveLength(1)
  })

  it('restores a backup with own types into an empty app', async () => {
    const neck = await addMetric('Nacke')
    const thigh = await addMetric('Lår, vänster')
    await addEntry('weight', 82.4, at(1))
    await addEntry(neck.id, 38.5, at(2))
    await addEntry(thigh.id, 55, at(2))
    await addEntry('hip', 101.5, at(3))
    await addEntry('chest', 104.5, at(3))

    const csv = toCsv(csvRows(await getAllEntries(), await getMetrics()))
    await clearAllData()
    const result = parseCsv(csv)
    expect(result.errors).toEqual([])
    expect(await importRows(result.rows)).toEqual({ added: 5, skipped: 0 })

    const names = new Map((await getMetrics()).map((m) => [m.id, m.name]))
    expect([...names.values()].sort()).toEqual(['Bröst', 'Höft', 'Lår, vänster', 'Midja', 'Nacke'])
    const restored = (await getAllEntries()).map((e) => `${names.get(e.metricId) ?? e.metricId} ${e.value}`).sort()
    expect(restored).toEqual(['Bröst 104.5', 'Höft 101.5', 'Lår, vänster 55', 'Nacke 38.5', 'weight 82.4'])
  })

  it('clears everything and puts the default types back', async () => {
    await addEntry('weight', 82.4, at(1))
    await setName('Wictor')
    await addMetric('Lår')
    await deleteMetric('hip')
    await clearAllData()
    expect(await db.entries.count()).toBe(0)
    expect((await getProfile()).name).toBe('')
    expect((await getMetrics()).map((m) => m.id).sort()).toEqual(['chest', 'hip', 'waist'])
  })
})
