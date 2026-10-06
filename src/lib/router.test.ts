import { describe, expect, it } from 'vitest'
import { APP_HISTORY_STATE, backTarget, detailMetricId, parseHash, routeToHash, tabOf, tabsFor, type Route } from './router'

describe('router', () => {
  it('parses known hashes', () => {
    expect(parseHash('')).toEqual({ name: 'home' })
    expect(parseHash('#/')).toEqual({ name: 'home' })
    expect(parseHash('#/matt')).toEqual({ name: 'measures' })
    expect(parseHash('#/installningar')).toEqual({ name: 'settings' })
    expect(parseHash('#/start')).toEqual({ name: 'setup' })
    expect(parseHash('#/metric/waist')).toEqual({ name: 'metric', metricId: 'waist' })
  })
  it('parses any metric id, also a UUID', () => {
    expect(parseHash('#/metric/chest')).toEqual({ name: 'metric', metricId: 'chest' })
    expect(parseHash('#/metric/3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b')).toEqual({
      name: 'metric',
      metricId: '3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b',
    })
  })
  it('falls back to home for unknown hashes', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'home' })
    expect(parseHash('#/metric/')).toEqual({ name: 'home' })
    expect(parseHash('#/metric/a/b')).toEqual({ name: 'home' })
  })
  it('opens a detail screen only for weight and for types that exist', () => {
    const ids = ['waist', 'abc']
    expect(detailMetricId({ name: 'metric', metricId: 'weight' }, ids)).toBe('weight')
    expect(detailMetricId({ name: 'metric', metricId: 'abc' }, ids)).toBe('abc')
    expect(detailMetricId({ name: 'metric', metricId: 'gone' }, ids)).toBeNull()
    expect(detailMetricId({ name: 'measures' }, ids)).toBeNull()
  })
  it('shows Mått for a type that no longer exists', () => {
    expect(tabOf({ name: 'metric', metricId: 'gone' })).toBe('measures')
  })
  it('round-trips every route', () => {
    const routes: Route[] = [{ name: 'setup' }, { name: 'home' }, { name: 'measures' }, { name: 'settings' }, { name: 'metric', metricId: 'weight' }]
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
  it('adds the setup tab first only in demo mode', () => {
    expect(tabsFor(false)).toEqual(['home', 'measures', 'settings'])
    expect(tabsFor(true)).toEqual(['setup', 'home', 'measures', 'settings'])
  })
  it('shows Hem for the setup route outside demo mode', () => {
    expect(tabOf({ name: 'setup' }, true)).toBe('setup')
    expect(tabOf({ name: 'setup' }, false)).toBe('home')
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
