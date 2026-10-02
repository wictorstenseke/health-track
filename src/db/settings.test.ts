import { describe, expect, it } from 'vitest'
import { getProfile, setHeightCm, setLastExportAt, setName } from './settings'

describe('settings', () => {
  it('returns an empty profile by default', async () => {
    expect(await getProfile()).toEqual({ name: '', heightCm: null, lastExportAt: null, demo: false })
  })

  it('stores name, height and last export', async () => {
    await setName('  Wictor ')
    await setHeightCm(183)
    await setLastExportAt(1234)
    expect(await getProfile()).toEqual({ name: 'Wictor', heightCm: 183, lastExportAt: 1234, demo: false })
  })

  it('clears height with null', async () => {
    await setHeightCm(183)
    await setHeightCm(null)
    expect((await getProfile()).heightCm).toBeNull()
  })
})
