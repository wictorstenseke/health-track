import { describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addEntries, addEntry, clearAllData, deleteEntry, getAllEntries, getEntries, importRows, restoreEntry, updateEntry,
} from './entries'
import { getProfile, setName } from './settings'

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

  it('clears everything', async () => {
    await addEntry('weight', 82.4, at(1))
    await setName('Wictor')
    await clearAllData()
    expect(await db.entries.count()).toBe(0)
    expect((await getProfile()).name).toBe('')
  })
})
