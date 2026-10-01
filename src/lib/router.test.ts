import { describe, expect, it } from 'vitest'
import { APP_HISTORY_STATE, backTarget, parseHash, routeToHash, tabOf, type Route } from './router'

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
  it('puts each detail screen under the tab whose card opens it', () => {
    expect(tabOf({ name: 'home' })).toBe('home')
    expect(tabOf({ name: 'measures' })).toBe('measures')
    expect(tabOf({ name: 'settings' })).toBe('settings')
    expect(tabOf({ name: 'metric', metricId: 'weight' })).toBe('home')
    expect(tabOf({ name: 'metric', metricId: 'waist' })).toBe('measures')
    expect(tabOf({ name: 'metric', metricId: 'hip' })).toBe('measures')
  })
  it('goes back through history only from entries the app pushed itself', () => {
    expect(backTarget(APP_HISTORY_STATE, { name: 'metric', metricId: 'waist' })).toBe('history')
  })
  it("goes to the detail screen's tab when it was opened directly", () => {
    expect(backTarget(null, { name: 'metric', metricId: 'weight' })).toEqual({ name: 'home' })
    expect(backTarget(null, { name: 'metric', metricId: 'hip' })).toEqual({ name: 'measures' })
    expect(backTarget({ other: 'app' }, { name: 'metric', metricId: 'hip' })).toEqual({ name: 'measures' })
  })
})
