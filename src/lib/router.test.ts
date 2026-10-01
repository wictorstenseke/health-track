import { describe, expect, it } from 'vitest'
import { parseHash, routeToHash, type Route } from './router'

describe('router', () => {
  it('parses known hashes', () => {
    expect(parseHash('')).toEqual({ name: 'home' })
    expect(parseHash('#/')).toEqual({ name: 'home' })
    expect(parseHash('#/matt')).toEqual({ name: 'measures' })
    expect(parseHash('#/installningar')).toEqual({ name: 'settings' })
    expect(parseHash('#/metric/waist')).toEqual({ name: 'metric', metricId: 'waist' })
  })
  it('falls back to home for unknown hashes', () => {
    expect(parseHash('#/metric/chest')).toEqual({ name: 'home' })
    expect(parseHash('#/nope')).toEqual({ name: 'home' })
  })
  it('round-trips every route', () => {
    const routes: Route[] = [{ name: 'home' }, { name: 'measures' }, { name: 'settings' }, { name: 'metric', metricId: 'weight' }]
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r)
  })
})
