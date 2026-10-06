import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { VagenDb } from './db'

const typesOf = async (db: VagenDb) => (await db.metrics.toArray()).map((m) => [m.id, m.name]).sort()
const DEFAULTS = [['hip', 'Höft'], ['waist', 'Midja']]

describe('schema', () => {
  it('upgrades a version 1 database: the data stays and the default types arrive', async () => {
    const name = 'vagen-upgrade-test'
    const v1 = new Dexie(name)
    v1.version(1).stores({ entries: 'id, metricId, takenAt, [metricId+takenAt]', settings: 'key' })
    await v1.table('entries').add({ id: 'e1', metricId: 'waist', value: 92.5, takenAt: 1, createdAt: 1, updatedAt: 1 })
    await v1.table('settings').put({ key: 'name', value: 'Wictor' })
    v1.close()

    const upgraded = new VagenDb(name)
    expect(await typesOf(upgraded)).toEqual(DEFAULTS)
    expect((await upgraded.entries.get('e1'))?.value).toBe(92.5)
    expect((await upgraded.settings.get('name'))?.value).toBe('Wictor')
    await upgraded.delete()
  })

  it('gives a new database the default types', async () => {
    const fresh = new VagenDb('vagen-fresh-test')
    expect(await typesOf(fresh)).toEqual(DEFAULTS)
    await fresh.delete()
  })
})
