import { describe, expect, it } from 'vitest'
import { isMajorUpdate } from './release'

describe('isMajorUpdate', () => {
  it('warns only when the major version goes up', () => {
    expect(isMajorUpdate('1.0.0+abc1234', '2.0.0')).toBe(true)
    expect(isMajorUpdate('1.0.0', '1.1.0')).toBe(false)
    expect(isMajorUpdate('1.4.2', '1.4.3')).toBe(false)
  })

  it('stays quiet for dev builds and odd input', () => {
    expect(isMajorUpdate('dev', '2.0.0')).toBe(false)
    expect(isMajorUpdate('1.0.0', 'garbage')).toBe(false)
  })
})
