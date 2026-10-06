import { describe, expect, it } from 'vitest'
import { db } from './db'
import { addEntry, getAllEntries } from './entries'
import { addMetric, deleteMetric, getMetrics } from './metrics'

const at = (d: number) => new Date(2026, 8, d, 8).getTime()

describe('metrics', () => {
  it('starts with Midja and Höft', async () => {
    expect((await getMetrics()).map((m) => m.name).sort()).toEqual(['Höft', 'Midja'])
  })

  it('adds a type with a cleaned name and an id of its own', async () => {
    const metric = await addMetric('  Vänster   överarm ')
    expect(metric.name).toBe('Vänster överarm')
    expect(['weight', 'waist', 'hip']).not.toContain(metric.id)
    expect(await db.metrics.get(metric.id)).toEqual(metric)
  })

  it('refuses a name that is taken, reserved or empty', async () => {
    await expect(addMetric('midja')).rejects.toThrow()
    await expect(addMetric('Vikt')).rejects.toThrow()
    await expect(addMetric('   ')).rejects.toThrow()
    expect(await db.metrics.count()).toBe(2)
  })

  it('deletes a type together with its entries and leaves the rest', async () => {
    await addEntry('waist', 92.5, at(1))
    await addEntry('waist', 92, at(2))
    const hip = await addEntry('hip', 101, at(3))
    const weight = await addEntry('weight', 82.4, at(4))
    await deleteMetric('waist')
    expect((await getMetrics()).map((m) => m.id)).toEqual(['hip'])
    expect(await getAllEntries()).toEqual([hip, weight])
  })

  it('never deletes weight', async () => {
    await addEntry('weight', 82.4, at(1))
    await expect(deleteMetric('weight')).rejects.toThrow()
    expect(await db.entries.count()).toBe(1)
  })
})
