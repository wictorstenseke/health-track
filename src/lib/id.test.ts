import { describe, expect, it } from 'vitest'
import { newId } from './id'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  it('returns a v4 uuid', () => {
    expect(newId()).toMatch(UUID)
  })

  it('works where crypto.randomUUID is missing (plain http)', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      expect(newId()).toMatch(UUID)
    } finally {
      Reflect.deleteProperty(crypto, 'randomUUID')
    }
    expect(typeof crypto.randomUUID).toBe('function')
  })
})
