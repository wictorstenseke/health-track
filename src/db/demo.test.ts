import { describe, expect, it } from 'vitest'
import { demoRows } from '../lib/demo'
import { clearAllData, addEntry, getAllEntries } from './entries'
import { startDemo } from './demo'
import { getProfile } from './settings'

const now = new Date(2026, 9, 2, 9, 30).getTime()

describe('demo', () => {
  it('fills in the example profile and data', async () => {
    await startDemo(now)
    expect(await getProfile()).toEqual({ name: 'Alex', heightCm: 178, lastExportAt: null, demo: true })
    expect(await getAllEntries()).toHaveLength(demoRows(now).length)
  })

  it('never mixes into entries that are already there', async () => {
    await addEntry('weight', 82.4, now)
    await startDemo(now)
    expect(await getAllEntries()).toHaveLength(1)
    expect((await getProfile()).demo).toBe(false)
  })

  it('ends with all data cleared', async () => {
    await startDemo(now)
    await clearAllData()
    expect(await getAllEntries()).toEqual([])
    expect(await getProfile()).toEqual({ name: '', heightCm: null, lastExportAt: null, demo: false })
  })
})
