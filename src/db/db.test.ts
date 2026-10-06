import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { VagenDb } from './db'

const typesOf = async (db: VagenDb) => (await db.metrics.toArray()).map((m) => [m.id, m.name]).sort()
const DEFAULTS = [['chest', 'Bröst'], ['hip', 'Höft'], ['waist', 'Midja']]

/** A database as version 2 left it: Midja and Höft unless `metrics` says otherwise. */
async function createV2(name: string, metrics: { id: string; name: string }[]) {
  const v2 = new Dexie(name)
  v2.version(1).stores({ entries: 'id, metricId, takenAt, [metricId+takenAt]', settings: 'key' })
  v2.version(2).stores({ metrics: 'id' })
  await v2.table('metrics').bulkAdd(metrics.map((m) => ({ ...m, createdAt: 1 })))
  await v2.table('entries').add({ id: 'e1', metricId: 'waist', value: 92.5, takenAt: 1, createdAt: 1, updatedAt: 1 })
  v2.close()
}

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

  it('adds Bröst to a version 2 database and leaves the rest alone', async () => {
    const name = 'vagen-v2-test'
    await createV2(name, [{ id: 'waist', name: 'Midja' }, { id: 'hip', name: 'Höft' }, { id: 'own-1', name: 'Lår' }])

    const upgraded = new VagenDb(name)
    expect(await typesOf(upgraded)).toEqual([['chest', 'Bröst'], ['hip', 'Höft'], ['own-1', 'Lår'], ['waist', 'Midja']])
    expect((await upgraded.entries.get('e1'))?.value).toBe(92.5)
    await upgraded.delete()
  })

  it("keeps the user's own Bröst instead of adding a second one", async () => {
    const name = 'vagen-v2-own-chest-test'
    await createV2(name, [{ id: 'waist', name: 'Midja' }, { id: 'hip', name: 'Höft' }, { id: 'own-1', name: 'bröst' }])

    const upgraded = new VagenDb(name)
    expect(await typesOf(upgraded)).toEqual([['hip', 'Höft'], ['own-1', 'bröst'], ['waist', 'Midja']])
    await upgraded.delete()
  })

  it('does not bring back a default the user deleted in version 2', async () => {
    const name = 'vagen-v2-deleted-test'
    await createV2(name, [{ id: 'waist', name: 'Midja' }])

    const upgraded = new VagenDb(name)
    expect(await typesOf(upgraded)).toEqual([['chest', 'Bröst'], ['waist', 'Midja']])
    await upgraded.delete()
  })
})
