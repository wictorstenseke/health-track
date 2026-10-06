# Own Measurement Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On Mått the user can create their own measurement types from the `+ Ny mätning` sheet and delete any type, and the yearly summary under each type says its unit (`−3,5 cm i år`).

**Architecture:** Metric ids stop being a code union and become strings. `weight` stays a code constant; every other metric is a row in a new Dexie table `metrics` (schema v2), seeded with Midja and Höft. Rules (names, order, ranges, CSV labels) are pure functions in `src/lib/metrics.ts`; storage is `src/db/metrics.ts`; screens read the types from the same live query as the entries. CSV writes a built-in metric by its id and an own type by its name, and import creates the types it doesn't find.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Tailwind CSS 4, Dexie 4 + dexie-react-hooks, Vitest 5 + fake-indexeddb. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-06-custom-measures-design.md`. The product spec `docs/spec.md` is updated in Task 8.

## Global Constraints

- Swedish UI. Every user-visible string lives in `src/i18n/sv.ts`.
- Copy, verbatim: `Skapa nytt mått` (button in the sheet), `Nytt mått` (title of the name view), `Namn` (field label), `Finns redan` (taken or reserved name), `Radera mått` (button and confirm title), `−3,5 cm i år` (summary), `Bröst och dess 14 mätningar raderas. Det går inte att ångra.` / `Bröst raderas.` (confirm text).
- `weight`: kg, valid 20–300, a code constant, never a row in `metrics`, never deletable.
- Every other metric: a row in `metrics`, cm, valid **1–300**. Values rounded to 1 decimal on write (`roundValue`), as today.
- Name rules: trimmed, runs of whitespace as one space, 1–30 characters, unique among the types ignoring case, and not `Vikt`, `weight`, `waist` or `hip` (ignoring case).
- Default types: `{ id: 'waist', name: 'Midja' }`, `{ id: 'hip', name: 'Höft' }`. Own types get `id = newId()`. Never call `crypto.randomUUID` directly.
- Schema changes only through a new `this.version(n)`. Never edit version 1 and never delete the database.
- Lists of types are sorted A–Ö with Swedish collation, ignoring case.
- Colours and sizes come from the existing Tailwind tokens (`ember-*`, `ink`, `fill`, `muted`, `faint`, `surface`); no one-off px sizes for type.
- Tests run in Node (`environment: 'node'`), so there are no component tests. Logic goes in pure functions that are tested; screens are checked by hand in the dev server: `npm run dev`, then `http://localhost:5173/health-track/` (on an empty app, tap `Kika runt med exempeldata`).
- Run `npm test` and `npx tsc -b` before every commit. Both must pass.
- Commit messages follow the repo: `feat: a lowercase sentence`, ending with the line `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

Inputs and conditions the spec implies but doesn't spell out. Each has a test in the task that owns the code.

1. A CSV `metric` cell or sheet header that is also an `Object.prototype` key (`toString`, `constructor`): it is a plain name, not an alias and not a crash. → Task 5.
2. One new type on many CSV rows, written with different case or spacing (`Bröst`, `bröst`): one type is created, not several. → Task 5.
3. A name with `,` or `"` in it: it survives export followed by import. → Task 5.
4. A route to a type that no longer exists (reload after deleting, a stale link): Mått is shown. And weight can never be deleted, whatever calls `deleteMetric`. → Tasks 3 and 4.
5. Names that differ only by case or spacing (`Vänster  arm` / `vänster arm`), or are only spaces: rejected. → Task 2.

Checked by hand because they are taps, not logic: a double tap on `Spara` in the name view creates one type; a double tap on `Radera` goes back once. → Tasks 6 and 7.

## File Map

```
src/lib/format.ts                 + formatDeltaValue                                   (Task 1)
src/lib/metrics.ts                types, default types, units, ranges, name rules,
                                  sorting, CSV label resolution                        (Tasks 2, 4)
src/db/db.ts                      schema v2: `metrics` table, seeded                   (Task 3)
src/db/metrics.ts          new    getMetrics, addMetric, deleteMetric                  (Task 3)
src/db/db.test.ts          new    migration and new-install tests                      (Task 3)
src/db/metrics.test.ts     new    create and delete                                    (Tasks 3, 4)
src/db/entries.ts                 clearAllData resets the types; importRows resolves   (Tasks 3, 5)
src/db/hooks.tsx                  DataProvider, useMetrics, useMetricName              (Task 4)
src/lib/router.ts                 any id parses; detailMetricId                        (Task 4)
src/lib/csv.ts                    labels, quoting, csvRows                             (Tasks 4, 5)
src/lib/demo.ts, src/db/demo.ts   rows use labels; transaction includes `metrics`      (Task 5)
src/components/Fields.tsx         + TextField                                          (Task 6)
src/components/MeasureSheet.tsx   fields from the table; name view                     (Tasks 4, 6)
src/screens/MeasuresScreen.tsx    rows from the table, with the unit                   (Tasks 1, 4)
src/screens/DetailScreen.tsx      name and unit from the table; Radera mått            (Tasks 4, 7)
src/components/EntrySheet.tsx     label and unit from the table                        (Task 4)
src/screens/SettingsScreen.tsx    export passes the types                              (Task 5)
src/i18n/sv.ts                    new strings                                          (Tasks 4, 6, 7)
src/i18n/sv.test.ts        new    the confirm text                                     (Task 7)
docs/spec.md                      product spec                                         (Task 8)
```

---

### Task 1: The yearly change says its unit

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `src/screens/MeasuresScreen.tsx:8,22`, `src/screens/HomeScreen.tsx:13,33`

**Interfaces:**
- Produces: `formatDeltaValue(d: number, unit: Unit): string` → `'−3,5 cm'`, `'+0,3 kg'`.

- [ ] **Step 1: Write the failing test**

In `src/lib/format.test.ts`, add `sv` and `formatDeltaValue` to the imports:

```ts
import { sv } from '../i18n/sv'
import {
  formatDate, formatDelta, formatDeltaValue, formatMonthInitial, formatNumber, formatRelativeDay,
  formatRowDate, formatTime, formatValue, parseDecimal,
} from './format'
```

and add inside `describe('numbers', …)`, after the `signs deltas` test:

```ts
  it('puts the unit after a delta', () => {
    expect(formatDeltaValue(-3.5, 'cm')).toBe('−3,5 cm')
    expect(formatDeltaValue(0.3, 'kg')).toBe('+0,3 kg')
    expect(sv.measures.thisYear(formatDeltaValue(-3.5, 'cm'))).toBe('−3,5 cm i år')
  })
```

The minus is U+2212 (`−`), the same character the existing `formatDelta` test uses. Copy it from there.

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL, `formatDeltaValue is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/format.ts`, under `formatDelta`:

```ts
/** +0,3 kg / −3,5 cm */
export const formatDeltaValue = (d: number, unit: Unit) => `${signed.format(d)} ${unit}`
```

In `src/screens/MeasuresScreen.tsx`, line 8 becomes:

```ts
import { formatDeltaValue, formatValue } from '../lib/format'
```

and the summary line (22) becomes:

```tsx
        {stats && stats.count >= 2 && (
          <span className="block text-sm text-muted">{sv.measures.thisYear(formatDeltaValue(stats.change, METRICS[metricId].unit))}</span>
        )}
```

In `src/screens/HomeScreen.tsx`, line 13 becomes `import { formatDeltaValue } from '../lib/format'` and line 33 becomes:

```tsx
        {stats && stats.count >= 2 && <span className="text-lg font-semibold tabular-nums">{formatDeltaValue(stats.change, 'kg')}</span>}
```

- [ ] **Step 4: Run the checks**

Run: `npm test && npx tsc -b`
Expected: all tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/screens/MeasuresScreen.tsx src/screens/HomeScreen.tsx
git commit -m "feat: the yearly change on Mått says its unit" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Rules for measurement types

Pure functions only, all additions. `MetricId`, `METRICS`, `MEASURE_METRIC_IDS` and `isMetricId` stay as they are until Task 4 removes them; after this task `METRICS` is only read for `.unit`.

**Files:**
- Modify: `src/lib/metrics.ts`, `src/lib/metrics.test.ts`

**Interfaces:**
- Produces (all exported from `src/lib/metrics.ts`):
  - `WEIGHT_ID = 'weight'`
  - `interface Metric { id: string; name: string; createdAt: number }`
  - `defaultMetrics(now?: number): Metric[]` — Midja (`waist`) and Höft (`hip`)
  - `BUILT_IN_IDS: string[]` — `['weight', 'waist', 'hip']`
  - `unitOf(metricId: string): Unit`
  - `isValidValue(metricId: string, v: number): boolean` — kg 20–300, cm 1–300
  - `METRIC_NAME_MAX = 30`
  - `cleanName(name: string): string`
  - `type NameProblem = 'empty' | 'tooLong' | 'taken'`
  - `nameProblem(name: string, existing: Pick<Metric, 'name'>[]): NameProblem | null`
  - `sortMetrics<T extends Pick<Metric, 'name'>>(metrics: T[]): T[]`
  - `resolveLabel(label: string, metrics: Metric[]): { id: string; create?: string }`

- [ ] **Step 1: Write the failing tests**

In `src/lib/metrics.test.ts`, replace the import line with:

```ts
import {
  cleanName, defaultMetrics, isMetricId, isValidHeight, isValidValue, nameProblem, resolveLabel, roundValue, sortMetrics, unitOf,
} from './metrics'
```

and add these blocks at the end of the file:

```ts
describe('unitOf', () => {
  it('is kg for weight and cm for every measurement type', () => {
    expect(unitOf('weight')).toBe('kg')
    expect(unitOf('waist')).toBe('cm')
    expect(unitOf('3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b')).toBe('cm')
  })
})

describe('isValidValue for a measurement type', () => {
  it('goes down to 1 cm, where weight stops at 20 kg', () => {
    expect(isValidValue('waist', 16.5)).toBe(true)
    expect(isValidValue('own-type', 1)).toBe(true)
    expect(isValidValue('own-type', 0.9)).toBe(false)
    expect(isValidValue('own-type', 300.1)).toBe(false)
    expect(isValidValue('weight', 16.5)).toBe(false)
  })
})

describe('defaultMetrics', () => {
  it('is Midja and Höft under the ids the CSV export uses', () => {
    expect(defaultMetrics(5)).toEqual([
      { id: 'waist', name: 'Midja', createdAt: 5 },
      { id: 'hip', name: 'Höft', createdAt: 5 },
    ])
  })
})

describe('cleanName', () => {
  it('trims and turns runs of whitespace into one space', () => {
    expect(cleanName('  Vänster   överarm ')).toBe('Vänster överarm')
  })
})

describe('nameProblem', () => {
  const existing = [{ name: 'Midja' }, { name: 'Höft' }, { name: 'Vänster arm' }]

  it('accepts a new name', () => {
    expect(nameProblem('Bröst', existing)).toBeNull()
  })
  it('rejects an empty name and one of only spaces', () => {
    expect(nameProblem('', existing)).toBe('empty')
    expect(nameProblem('   ', existing)).toBe('empty')
  })
  it('allows 30 characters and rejects 31', () => {
    expect(nameProblem('a'.repeat(30), existing)).toBeNull()
    expect(nameProblem('a'.repeat(31), existing)).toBe('tooLong')
  })
  it('rejects a name in use, whatever its case or spacing', () => {
    expect(nameProblem('midja', existing)).toBe('taken')
    expect(nameProblem('  HÖFT ', existing)).toBe('taken')
    expect(nameProblem('vänster  ARM', existing)).toBe('taken')
  })
  it('rejects the reserved words', () => {
    for (const name of ['Vikt', 'weight', 'Waist', 'HIP']) expect(nameProblem(name, [])).toBe('taken')
  })
})

describe('sortMetrics', () => {
  it('sorts A–Ö in Swedish order, ignoring case, and leaves the input alone', () => {
    const input = [{ name: 'Överarm' }, { name: 'bröst' }, { name: 'Ärm' }, { name: 'Vad' }, { name: 'Ål' }, { name: 'Arm' }]
    expect(sortMetrics(input).map((m) => m.name)).toEqual(['Arm', 'bröst', 'Vad', 'Ål', 'Ärm', 'Överarm'])
    expect(input[0].name).toBe('Överarm')
  })
})

describe('resolveLabel', () => {
  const metrics = [...defaultMetrics(0), { id: 'abc', name: 'Bröst', createdAt: 0 }]

  it('keeps weight', () => {
    expect(resolveLabel('weight', metrics)).toEqual({ id: 'weight' })
  })
  it('finds a type by its id', () => {
    expect(resolveLabel('waist', metrics)).toEqual({ id: 'waist' })
  })
  it('finds a type by its name, ignoring case', () => {
    expect(resolveLabel('bröst', metrics)).toEqual({ id: 'abc' })
  })
  it('asks for an unknown name to be created under a new id', () => {
    const resolved = resolveLabel('  Lår ', metrics)
    expect(resolved.create).toBe('Lår')
    expect(resolved.id).not.toBe('')
    expect(metrics.some((m) => m.id === resolved.id)).toBe(false)
  })
  it('brings a deleted default back under its own id and name', () => {
    expect(resolveLabel('waist', [])).toEqual({ id: 'waist', create: 'Midja' })
    expect(resolveLabel('hip', [])).toEqual({ id: 'hip', create: 'Höft' })
  })
  it('uses an own type called Midja when the default is gone', () => {
    expect(resolveLabel('waist', [{ id: 'xyz', name: 'midja', createdAt: 0 }])).toEqual({ id: 'xyz' })
  })
  it('treats a name that is also an Object property as a name', () => {
    expect(resolveLabel('toString', metrics).create).toBe('toString')
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -- src/lib/metrics.test.ts`
Expected: FAIL, the new imports are undefined (`unitOf is not a function`, and so on).

- [ ] **Step 3: Implement**

In `src/lib/metrics.ts`, add at the very top:

```ts
import { sv } from '../i18n/sv'
import { newId } from './id'
```

(`src/i18n/sv.ts` imports only a type from this file, so there is no runtime cycle.)

Add after `MEASURE_METRIC_IDS`:

```ts
/** The one fixed metric; Hem is built on it. Every other metric is a type the user can create and delete. */
export const WEIGHT_ID = 'weight'

/** A measurement type on the Mått tab: a row in the `metrics` table. Always cm. */
export interface Metric {
  id: string
  name: string
  createdAt: number
}

/** The types every install starts with. */
const DEFAULT_METRICS = [
  { id: 'waist', name: sv.metrics.waist },
  { id: 'hip', name: sv.metrics.hip },
]

export function defaultMetrics(now = Date.now()): Metric[] {
  return DEFAULT_METRICS.map((m) => ({ ...m, createdAt: now }))
}

/**
 * What the CSV export calls the built-in metrics. They are not available as names either, or a type called
 * "waist" would come back as Midja on import.
 */
export const BUILT_IN_IDS: string[] = [WEIGHT_ID, ...DEFAULT_METRICS.map((m) => m.id)]

export const unitOf = (metricId: string): Unit => (metricId === WEIGHT_ID ? 'kg' : 'cm')
```

Replace the existing `isValidValue` with:

```ts
/** Plausible range per unit. Values outside are rejected on input and import. */
const VALID_RANGE: Record<Unit, { min: number; max: number }> = { kg: { min: 20, max: 300 }, cm: { min: 1, max: 300 } }

export function isValidValue(metricId: string, v: number): boolean {
  const { min, max } = VALID_RANGE[unitOf(metricId)]
  return Number.isFinite(v) && v >= min && v <= max
}
```

Add after it:

```ts
export const METRIC_NAME_MAX = 30

/** Trimmed, with runs of whitespace as one space. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ')

/** Two names are the same when their folded forms are: case and spacing don't count. */
const fold = (name: string) => cleanName(name).toLocaleLowerCase('sv')

export type NameProblem = 'empty' | 'tooLong' | 'taken'

/** Why `name` can't be a new type's name, or null when it can. A reserved word counts as taken. */
export function nameProblem(name: string, existing: Pick<Metric, 'name'>[]): NameProblem | null {
  const clean = cleanName(name)
  if (clean === '') return 'empty'
  if (clean.length > METRIC_NAME_MAX) return 'tooLong'
  const folded = fold(clean)
  const reserved = folded === fold(sv.metrics.weight) || BUILT_IN_IDS.includes(folded)
  return reserved || existing.some((m) => fold(m.name) === folded) ? 'taken' : null
}

const collator = new Intl.Collator('sv', { sensitivity: 'base' })

/** A–Ö by name in Swedish order, ignoring case. Returns a copy. */
export function sortMetrics<T extends Pick<Metric, 'name'>>(metrics: T[]): T[] {
  return [...metrics].sort((a, b) => collator.compare(a.name, b.name))
}

/**
 * The metric a CSV label stands for. With `create` set, the type isn't stored yet and must be added under that
 * name first: an own type from another install, or a default type the user has deleted.
 */
export function resolveLabel(label: string, metrics: Metric[]): { id: string; create?: string } {
  if (label === WEIGHT_ID) return { id: WEIGHT_ID }
  const byId = metrics.find((m) => m.id === label)
  if (byId) return { id: byId.id }
  const fallback = DEFAULT_METRICS.find((m) => m.id === label)
  const name = fold(fallback?.name ?? label)
  const byName = metrics.find((m) => fold(m.name) === name)
  if (byName) return { id: byName.id }
  return fallback ? { id: fallback.id, create: fallback.name } : { id: newId(), create: cleanName(label) }
}
```

- [ ] **Step 4: Run the checks**

Run: `npm test && npx tsc -b`
Expected: all pass. The existing `isValidValue` and CSV tests still pass: weight keeps 20–300.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts
git commit -m "feat: rules for measurement types: names, order, ranges and CSV labels" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Measurement types in the database

**Files:**
- Modify: `src/db/db.ts`, `src/db/entries.ts` (`clearAllData`), `src/db/entries.test.ts`, `src/test/setup.ts`
- Create: `src/db/metrics.ts`, `src/db/metrics.test.ts`, `src/db/db.test.ts`

**Interfaces:**
- Consumes: `Metric`, `defaultMetrics`, `nameProblem`, `cleanName`, `WEIGHT_ID` from `src/lib/metrics.ts` (Task 2); `newId` from `src/lib/id.ts`.
- Produces:
  - `db.metrics: EntityTable<Metric, 'id'>`; `new VagenDb(name = 'vagen')`
  - `getMetrics(): Promise<Metric[]>` — unordered
  - `addMetric(name: string): Promise<Metric>` — throws when `nameProblem` rejects the name
  - `deleteMetric(id: string): Promise<void>` — removes the type and its entries; throws for `weight`
  - `clearAllData()` now also resets `metrics` to the two defaults

- [ ] **Step 1: Write the failing tests**

Create `src/db/db.test.ts`:

```ts
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
```

Create `src/db/metrics.test.ts`:

```ts
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
```

In `src/db/entries.test.ts`, add `import { addMetric, deleteMetric, getMetrics } from './metrics'` and replace the last test (`clears everything`) with:

```ts
  it('clears everything and puts the default types back', async () => {
    await addEntry('weight', 82.4, at(1))
    await setName('Wictor')
    await addMetric('Bröst')
    await deleteMetric('hip')
    await clearAllData()
    expect(await db.entries.count()).toBe(0)
    expect((await getProfile()).name).toBe('')
    expect((await getMetrics()).map((m) => m.id).sort()).toEqual(['hip', 'waist'])
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -- src/db`
Expected: FAIL. `db.test.ts`: `metrics` is undefined on `VagenDb`; `metrics.test.ts` and `entries.test.ts`: cannot find module `./metrics`.

- [ ] **Step 3: Implement the schema**

Replace `src/db/db.ts` with:

```ts
import { Dexie, type EntityTable } from 'dexie'
import { defaultMetrics, type Entry, type Metric } from '../lib/metrics'

export type SettingKey = 'name' | 'heightCm' | 'lastExportAt' | 'demo'

export interface Setting {
  key: SettingKey
  value: string | number
}

/**
 * Schema changes: add a new `this.version(n + 1).stores(...)` (with `.upgrade()` if data must move).
 * Never edit an existing version and never delete the database.
 */
export class VagenDb extends Dexie {
  declare entries: EntityTable<Entry, 'id'>
  declare settings: EntityTable<Setting, 'key'>
  declare metrics: EntityTable<Metric, 'id'>

  /** `name` is there for the migration test; the app always uses the default. */
  constructor(name = 'vagen') {
    // Named for the app's first name, Vågen; renaming it would leave the stored data behind.
    super(name)
    this.version(1).stores({
      entries: 'id, metricId, takenAt, [metricId+takenAt]',
      settings: 'key',
    })
    // An install coming from version 1 gets the default types here. A new database gets them from `populate`,
    // because Dexie runs no upgrade when it creates the database.
    this.version(2)
      .stores({ metrics: 'id' })
      .upgrade((tx) => tx.table('metrics').bulkAdd(defaultMetrics()))
    this.on('populate', (tx) => {
      void tx.table('metrics').bulkAdd(defaultMetrics())
    })
  }
}

export const db = new VagenDb()
```

- [ ] **Step 4: Implement the data functions**

Create `src/db/metrics.ts`:

```ts
import { newId } from '../lib/id'
import { cleanName, nameProblem, WEIGHT_ID, type Metric } from '../lib/metrics'
import { db } from './db'

/** The measurement types on Mått, in no particular order. */
export async function getMetrics(): Promise<Metric[]> {
  return db.metrics.toArray()
}

/** Creates a type. The form checks the name with `nameProblem` first, so a bad name here is a bug and throws. */
export async function addMetric(name: string): Promise<Metric> {
  return db.transaction('rw', db.metrics, async () => {
    const problem = nameProblem(name, await db.metrics.toArray())
    if (problem) throw new Error(`Can't create a type called "${name}": ${problem}`)
    const metric: Metric = { id: newId(), name: cleanName(name), createdAt: Date.now() }
    await db.metrics.add(metric)
    return metric
  })
}

/** Removes a type and every entry measured with it. There is no undo. Weight is not a type and can't be removed. */
export async function deleteMetric(id: string): Promise<void> {
  if (id === WEIGHT_ID) throw new Error("Weight can't be deleted")
  await db.transaction('rw', db.metrics, db.entries, async () => {
    await db.entries.where('metricId').equals(id).delete()
    await db.metrics.delete(id)
  })
}
```

In `src/db/entries.ts`, change the metrics import to

```ts
import { defaultMetrics, roundValue, type Entry, type MetricId } from '../lib/metrics'
```

and replace `clearAllData` with:

```ts
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.entries, db.settings, db.metrics, async () => {
    await db.entries.clear()
    await db.settings.clear()
    await db.metrics.clear()
    await db.metrics.bulkAdd(defaultMetrics())
  })
}
```

Replace `src/test/setup.ts` with:

```ts
import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { db } from '../db/db'
import { defaultMetrics } from '../lib/metrics'

beforeEach(async () => {
  await db.entries.clear()
  await db.settings.clear()
  await db.metrics.clear()
  await db.metrics.bulkAdd(defaultMetrics())
})
```

- [ ] **Step 5: Run the checks**

Run: `npm test && npx tsc -b`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/db/db.ts src/db/db.test.ts src/db/metrics.ts src/db/metrics.test.ts src/db/entries.ts src/db/entries.test.ts src/test/setup.ts
git commit -m "feat: measurement types are stored in the database" -m "Schema version 2 adds the metrics table, seeded with Midja and Höft." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The app reads its types from the database

`MetricId` becomes `string` and the code constants for waist and hip go. Nothing new is offered to the user yet; the visible change is that Mått and the sheet list the types A–Ö (Höft before Midja). CSV keeps reading only the three built-in metrics until Task 5.

**Files:**
- Modify: `src/lib/metrics.ts`, `src/lib/metrics.test.ts`, `src/lib/router.ts`, `src/lib/router.test.ts`, `src/lib/csv.ts`
- Modify: `src/db/hooks.tsx`, `src/db/metrics.test.ts`, `src/App.tsx`, `src/i18n/sv.ts`
- Modify: `src/screens/MeasuresScreen.tsx`, `src/components/MeasureSheet.tsx`, `src/screens/DetailScreen.tsx`, `src/components/EntrySheet.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2 and 3.
- Produces:
  - `type MetricId = string`; `METRICS`, `MetricDef`, `MEASURE_METRIC_IDS` and `isMetricId` no longer exist
  - `detailMetricId(route: Route, metricIds: MetricId[]): MetricId | null` in `src/lib/router.ts`
  - `DataProvider` (replaces `EntriesProvider`), `useMetrics(): Metric[]` (A–Ö), `useMetricName(metricId: MetricId): string` in `src/db/hooks.tsx`

- [ ] **Step 1: Update the router tests**

In `src/lib/router.test.ts`, add `detailMetricId` to the import from `./router`, and replace the test `falls back to home for unknown hashes` with:

```ts
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -- src/lib/router.test.ts`
Expected: FAIL, `detailMetricId is not a function`, and `#/metric/chest` still parses as home.

- [ ] **Step 3: Rewrite `src/lib/metrics.ts`**

Replace the whole file with:

```ts
import { sv } from '../i18n/sv'
import { newId } from './id'

/** `weight`, or the id of a measurement type. */
export type MetricId = string
export type Unit = 'kg' | 'cm'

/** The one fixed metric; Hem is built on it. Every other metric is a type the user can create and delete. */
export const WEIGHT_ID = 'weight'

/** A measurement type on the Mått tab: a row in the `metrics` table. Always cm. */
export interface Metric {
  id: MetricId
  name: string
  createdAt: number
}

/** The types every install starts with. */
const DEFAULT_METRICS = [
  { id: 'waist', name: sv.metrics.waist },
  { id: 'hip', name: sv.metrics.hip },
]

export function defaultMetrics(now = Date.now()): Metric[] {
  return DEFAULT_METRICS.map((m) => ({ ...m, createdAt: now }))
}

/**
 * What the CSV export calls the built-in metrics. They are not available as names either, or a type called
 * "waist" would come back as Midja on import.
 */
export const BUILT_IN_IDS: MetricId[] = [WEIGHT_ID, ...DEFAULT_METRICS.map((m) => m.id)]

export interface Entry {
  id: string
  metricId: MetricId
  /** kg or cm, rounded to 1 decimal */
  value: number
  /** epoch ms */
  takenAt: number
  createdAt: number
  updatedAt: number
}

export const unitOf = (metricId: MetricId): Unit => (metricId === WEIGHT_ID ? 'kg' : 'cm')

/** Rounds to 1 decimal. `+ 0` turns -0 into 0. */
export function roundValue(v: number): number {
  return Math.round(v * 10) / 10 + 0
}

/** Plausible range per unit. Values outside are rejected on input and import. */
const VALID_RANGE: Record<Unit, { min: number; max: number }> = { kg: { min: 20, max: 300 }, cm: { min: 1, max: 300 } }

export function isValidValue(metricId: MetricId, v: number): boolean {
  const { min, max } = VALID_RANGE[unitOf(metricId)]
  return Number.isFinite(v) && v >= min && v <= max
}

export const METRIC_NAME_MAX = 30

/** Trimmed, with runs of whitespace as one space. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ')

/** Two names are the same when their folded forms are: case and spacing don't count. */
const fold = (name: string) => cleanName(name).toLocaleLowerCase('sv')

export type NameProblem = 'empty' | 'tooLong' | 'taken'

/** Why `name` can't be a new type's name, or null when it can. A reserved word counts as taken. */
export function nameProblem(name: string, existing: Pick<Metric, 'name'>[]): NameProblem | null {
  const clean = cleanName(name)
  if (clean === '') return 'empty'
  if (clean.length > METRIC_NAME_MAX) return 'tooLong'
  const folded = fold(clean)
  const reserved = folded === fold(sv.metrics.weight) || BUILT_IN_IDS.includes(folded)
  return reserved || existing.some((m) => fold(m.name) === folded) ? 'taken' : null
}

const collator = new Intl.Collator('sv', { sensitivity: 'base' })

/** A–Ö by name in Swedish order, ignoring case. Returns a copy. */
export function sortMetrics<T extends Pick<Metric, 'name'>>(metrics: T[]): T[] {
  return [...metrics].sort((a, b) => collator.compare(a.name, b.name))
}

/**
 * The metric a CSV label stands for. With `create` set, the type isn't stored yet and must be added under that
 * name first: an own type from another install, or a default type the user has deleted.
 */
export function resolveLabel(label: string, metrics: Metric[]): { id: MetricId; create?: string } {
  if (label === WEIGHT_ID) return { id: WEIGHT_ID }
  const byId = metrics.find((m) => m.id === label)
  if (byId) return { id: byId.id }
  const fallback = DEFAULT_METRICS.find((m) => m.id === label)
  const name = fold(fallback?.name ?? label)
  const byName = metrics.find((m) => fold(m.name) === name)
  if (byName) return { id: byName.id }
  return fallback ? { id: fallback.id, create: fallback.name } : { id: newId(), create: cleanName(label) }
}

export const HEIGHT_MIN_CM = 100
export const HEIGHT_MAX_CM = 250

export function isValidHeight(cm: number): boolean {
  return Number.isFinite(cm) && cm >= HEIGHT_MIN_CM && cm <= HEIGHT_MAX_CM
}
```

In `src/lib/metrics.test.ts`, remove `isMetricId` from the import and delete the whole `describe('isMetricId', …)` block.

In `src/i18n/sv.ts`, delete the first line (`import type { MetricId } from '../lib/metrics'`) and the blank line after it, and replace the `metrics` line with:

```ts
  // waist and hip are only what the default types are created as; after that a type goes by its stored name.
  metrics: { weight: 'Vikt', waist: 'Midja', hip: 'Höft' },
```

- [ ] **Step 4: Router**

In `src/lib/router.ts`, change the import to

```ts
import { WEIGHT_ID, type MetricId } from './metrics'
```

replace the two metric lines in `parseHash` with

```ts
  // Any id parses (own types have UUIDs); whether it exists is `detailMetricId`'s call, where the types are known.
  const metric = path.match(/^\/metric\/([\w-]+)$/)
  if (metric) return { name: 'metric', metricId: metric[1] }
```

change the last line of `tabOf` to

```ts
  return route.metricId === WEIGHT_ID ? 'home' : 'measures'
```

and add after `tabOf`:

```ts
/**
 * The metric a route opens a detail screen for, or null. A type that was deleted, or an id that never existed,
 * gets no detail screen: its tab (Mått) shows instead.
 */
export function detailMetricId(route: Route, metricIds: MetricId[]): MetricId | null {
  if (route.name !== 'metric') return null
  return route.metricId === WEIGHT_ID || metricIds.includes(route.metricId) ? route.metricId : null
}
```

- [ ] **Step 5: CSV keeps its three metrics**

In `src/lib/csv.ts`, change the metrics import to

```ts
import { BUILT_IN_IDS, isValidValue, type MetricId } from './metrics'
```

and replace both uses of `isMetricId`:

```ts
        cells.length >= 3 && BUILT_IN_IDS.includes(cells[1]) ? { kind: 'own', takenAt: 0, metric: 1, value: 2 } : { kind: 'legacy', columns: LEGACY_DEFAULT }
```

```ts
  if (takenAt === null || value === null || !BUILT_IN_IDS.includes(metricCell) || !isValidValue(metricCell, value)) return null
```

- [ ] **Step 6: Hooks**

Replace `src/db/hooks.tsx` with:

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { sortMetrics, WEIGHT_ID, type Entry, type Metric, type MetricId } from '../lib/metrics'
import { db } from './db'
import { getAllEntries } from './entries'
import { getMetrics } from './metrics'
import { getProfile, type Profile } from './settings'

interface Data {
  /** All metrics, oldest first. */
  entries: Entry[]
  /** The measurement types on Mått, A–Ö. */
  metrics: Metric[]
}

const DataContext = createContext<Data | null>(null)

/** One transaction, so a screen never gets a type without its entries, or entries without their type. */
const loadData = (): Promise<Data> =>
  db.transaction('r', db.entries, db.metrics, async () => ({ entries: await getAllEntries(), metrics: sortMetrics(await getMetrics()) }))

/**
 * One live query for every entry and type, kept in memory for all screens. The data set is small, and this way
 * a screen renders with its data on the first frame instead of waiting for IndexedDB each time it mounts.
 * Renders nothing until the first load.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const data = useLiveQuery(loadData)
  if (!data) return null
  return <DataContext value={data}>{children}</DataContext>
}

function useData(): Data {
  const data = useContext(DataContext)
  if (!data) throw new Error('Reading entries or types needs a DataProvider')
  return data
}

/** All metrics, oldest first. */
export function useAllEntries(): Entry[] {
  return useData().entries
}

/** One metric, oldest first. */
export function useEntries(metricId: MetricId): Entry[] {
  const all = useAllEntries()
  return useMemo(() => all.filter((e) => e.metricId === metricId), [all, metricId])
}

/** The measurement types on Mått, A–Ö. */
export function useMetrics(): Metric[] {
  return useData().metrics
}

/** What a metric is called: Vikt, or the type's own name. */
export function useMetricName(metricId: MetricId): string {
  const metrics = useMetrics()
  return metricId === WEIGHT_ID ? sv.metrics.weight : (metrics.find((m) => m.id === metricId)?.name ?? '')
}

/** `undefined` while loading. */
export function useProfile(): Profile | undefined {
  return useLiveQuery(getProfile)
}
```

- [ ] **Step 7: App**

In `src/App.tsx`:

```tsx
import { DataProvider, useMetrics, useProfile } from './db/hooks'
import { detailMetricId, routeToHash, tabOf, tabsFor, useRoute, type Route } from './lib/router'
```

In `App`, rename `<EntriesProvider>` / `</EntriesProvider>` to `<DataProvider>` / `</DataProvider>`.

The top of `Screens` becomes:

```tsx
function Screens() {
  const profile = useProfile()
  const route = useRoute()
  const metrics = useMetrics()
  const detailId = detailMetricId(route, metrics.map((m) => m.id))
  const isDetail = detailId !== null
  useScrollPerScreen(route, isDetail)

  if (!profile) return null
  const setupOnly = !profile.name
  const tab = tabOf(route, profile.demo)
```

(the old `const isDetail = route.name === 'metric'` line goes), and the detail line becomes:

```tsx
          {detailId !== null && <DetailScreen metricId={detailId} heightCm={profile.heightCm} />}
```

`useScrollPerScreen` takes the flag instead of working it out:

```tsx
/** Each tab keeps its own scroll position; a detail screen opens at the top. */
function useScrollPerScreen(route: Route, isDetail: boolean) {
  const positions = useRef(new Map<string, number>())
  const key = routeToHash(route)

  useLayoutEffect(() => {
```

(the rest of the hook is unchanged).

- [ ] **Step 8: Mått**

Replace `src/screens/MeasuresScreen.tsx` with:

```tsx
import { useState } from 'react'
import { Group, rowClass } from '../components/GroupedList'
import { ChevronRightIcon, PlusIcon } from '../components/icons'
import { MeasureSheet } from '../components/MeasureSheet'
import { Sparkline } from '../components/Sparkline'
import { useEntries, useMetrics } from '../db/hooks'
import { sv } from '../i18n/sv'
import { formatDeltaValue, formatValue } from '../lib/format'
import { unitOf, type Metric } from '../lib/metrics'
import { navigate } from '../lib/router'
import { latest, pointsInYear, yearStats } from '../lib/stats'

function MetricRow({ metric }: { metric: Metric }) {
  const entries = useEntries(metric.id)
  const year = new Date().getFullYear()
  const last = latest(entries)
  const stats = yearStats(entries, year)
  const unit = unitOf(metric.id)
  return (
    <button type="button" onClick={() => navigate({ name: 'metric', metricId: metric.id })} className={`${rowClass} py-3 text-left`}>
      {/* min-w-0 lets a long name truncate instead of pushing the value off the row. */}
      <span className="min-w-0">
        <span className="block truncate">{metric.name}</span>
        {stats && stats.count >= 2 && <span className="block text-sm text-muted">{sv.measures.thisYear(formatDeltaValue(stats.change, unit))}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <Sparkline values={pointsInYear(entries, year).map((p) => p.value)} />
        <span className="min-w-16 text-right font-semibold tabular-nums">{last ? formatValue(last.value, unit) : '–'}</span>
        <span className="text-faint">
          <ChevronRightIcon />
        </span>
      </span>
    </button>
  )
}

export function MeasuresScreen() {
  const metrics = useMetrics()
  const [measuring, setMeasuring] = useState(false)
  return (
    <main className="px-4 pt-(--screen-top) pb-28">
      <h1 className="text-3xl font-semibold tracking-tight">{sv.measures.title}</h1>
      <div className="mt-7">
        <Group label={sv.measures.circumference}>
          {metrics.map((metric) => (
            <MetricRow key={metric.id} metric={metric} />
          ))}
          <button
            type="button"
            onClick={() => setMeasuring(true)}
            className={`${rowClass} justify-start gap-2 font-medium text-ember-600 dark:text-ember-400`}
          >
            <PlusIcon />
            {sv.measures.newMeasurement}
          </button>
        </Group>
      </div>
      {measuring && <MeasureSheet onClose={() => setMeasuring(false)} />}
    </main>
  )
}
```

- [ ] **Step 9: The sheet**

Replace `src/components/MeasureSheet.tsx` with:

```tsx
import { useState } from 'react'
import { addEntries } from '../db/entries'
import { useMetrics } from '../db/hooks'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidValue, unitOf, type MetricId } from '../lib/metrics'
import { BottomSheet } from './BottomSheet'
import { DateTimeField } from './DateTimeField'
import { DecimalField } from './Fields'

/** Batch form: fill whichever measurements you took; all get the same timestamp. */
export function MeasureSheet({ onClose }: { onClose: () => void }) {
  const metrics = useMetrics()
  const [texts, setTexts] = useState<Partial<Record<MetricId, string>>>({})
  const [takenAt, setTakenAt] = useState<number | null>(null)

  const items = metrics.flatMap(({ id }) => {
    const text = texts[id] ?? ''
    if (text.trim() === '') return []
    const value = parseDecimal(text)
    return [{ metricId: id, value: value !== null && isValidValue(id, value) ? value : null }]
  })
  const canSave = items.length > 0 && items.every((i) => i.value !== null)

  const save = async () => {
    if (!canSave) return
    const valid = items.flatMap((i) => (i.value === null ? [] : [{ metricId: i.metricId, value: i.value }]))
    await addEntries(valid, takenAt ?? Date.now())
    onClose()
  }

  return (
    <BottomSheet title={sv.measures.formTitle} onClose={onClose}>
      {/* Scrolls when there are many types, so Spara stays on screen. The padding keeps the focus ring from being clipped. */}
      <div className="-mx-1 max-h-[40dvh] space-y-3 overflow-y-auto overscroll-contain px-1 py-1">
        {metrics.map(({ id, name }) => (
          <DecimalField
            key={id}
            label={name}
            unit={unitOf(id)}
            value={texts[id] ?? ''}
            onChange={(text) => setTexts((t) => ({ ...t, [id]: text }))}
            invalid={items.some((i) => i.metricId === id && i.value === null)}
          />
        ))}
      </div>
      <div className="my-5 flex justify-center">
        <DateTimeField value={takenAt} onChange={setTakenAt} />
      </div>
      <button
        type="button"
        disabled={!canSave}
        onClick={() => void save()}
        className="mx-auto block h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink disabled:opacity-40"
      >
        {sv.common.save}
      </button>
    </BottomSheet>
  )
}
```

- [ ] **Step 10: Detail screen and entry sheet**

In `src/screens/DetailScreen.tsx`:

```tsx
import { useEntries, useMetricName } from '../db/hooks'
```

```tsx
import { unitOf, WEIGHT_ID, type Entry, type MetricId } from '../lib/metrics'
```

Add `const name = useMetricName(metricId)` right after `const entries = useEntries(metricId)`, and replace `const unit = METRICS[metricId].unit` with `const unit = unitOf(metricId)`.

The title becomes (truncates, since a name can be 30 characters):

```tsx
        <h1 className="min-w-0 truncate text-3xl font-semibold tracking-tight">{name}</h1>
```

Replace both `metricId === 'weight'` in the Översikt group with `metricId === WEIGHT_ID`.

In `src/components/EntrySheet.tsx`:

```tsx
import { useMetricName } from '../db/hooks'
```

```tsx
import { isValidValue, unitOf, WEIGHT_ID, type Entry } from '../lib/metrics'
```

`const isWeight = entry.metricId === WEIGHT_ID`, add `const label = useMetricName(entry.metricId)` under it, and the field becomes:

```tsx
        <DecimalField label={label} unit={unitOf(entry.metricId)} value={text} onChange={setText} invalid={!valid} />
```

- [ ] **Step 11: A test the old types were in the way of**

In `src/db/metrics.test.ts`, add inside the `describe`:

```ts
  it('deletes an own type together with its entries', async () => {
    const chest = await addMetric('Bröst')
    await addEntry(chest.id, 104.5, at(1))
    const waist = await addEntry('waist', 92.5, at(2))
    await deleteMetric(chest.id)
    expect(await db.metrics.get(chest.id)).toBeUndefined()
    expect(await getAllEntries()).toEqual([waist])
  })
```

It passes at once: the behaviour is from Task 3, only `addEntry`'s old id union stopped it from compiling.

- [ ] **Step 12: Run the checks**

Run: `npm test && npx tsc -b`
Expected: all pass, no type errors. If `tsc` reports a leftover `METRICS`, `MEASURE_METRIC_IDS` or `isMetricId`, that use was missed above; `grep -rn "METRICS\|isMetricId" src` must print nothing.

- [ ] **Step 13: Check by hand**

Run `npm run dev` and open `http://localhost:5173/health-track/#/matt`.

- Mått lists Höft, then Midja, each with `… cm i år` under the name when the year has two or more entries.
- `+ Ny mätning` shows the fields in the same order; saving a value works.
- Tapping a row opens its detail screen with the right title; editing an entry shows the right label and `cm`.
- Hem → the year card opens the weight detail screen titled Vikt, with BMI.
- `http://localhost:5173/health-track/#/metric/nope` shows the Mått tab, not a blank screen.

- [ ] **Step 14: Commit**

```bash
git add src
git commit -m "feat: Mått lists its types from the database, A–Ö" -m "Metric ids are strings now; weight is the only one left in code." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: CSV carries own types

**Files:**
- Modify: `src/lib/csv.ts`, `src/lib/csv.test.ts`
- Modify: `src/db/entries.ts` (`importRows`), `src/db/entries.test.ts`
- Modify: `src/lib/demo.ts`, `src/lib/demo.test.ts`, `src/db/demo.ts`
- Modify: `src/io/csvFiles.ts`, `src/io/csvFiles.test.ts`, `src/screens/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `resolveLabel`, `BUILT_IN_IDS`, `cleanName`, `METRIC_NAME_MAX`, `WEIGHT_ID`, `isValidValue` (Task 2); `getMetrics`, `addMetric`, `deleteMetric` (Task 3); `useMetrics` (Task 4).
- Produces:
  - `interface CsvRow { metric: string; takenAt: number; value: number }` — `metric` is a label: `weight`, `waist`, `hip` or an own type's name. **The field `metricId` on `CsvRow` is gone.**
  - `csvRows(entries: { metricId: MetricId; takenAt: number; value: number }[], metrics: Metric[]): CsvRow[]`
  - `toCsv(rows: CsvRow[]): string`, `parseCsv` unchanged in signature
  - `importRows(rows: CsvRow[])` resolves labels and creates missing types

- [ ] **Step 1: Update and add the parser tests**

In `src/lib/csv.test.ts`:

1. Rename the row field everywhere in the file: every `metricId:` key becomes `metric:`, every `r.metricId` becomes `r.metric`, and the two `as const` after `'weight'` / `'hip'` in `round-trips an export` go.
2. Change the import to `import { csvRows, parseCsv, summarize, toCsv, yearFromFileName } from './csv'`.
3. Add inside `describe('toCsv', …)`:

```ts
  it('quotes a name with a comma or a quote in it', () => {
    const csv = toCsv([
      { metric: 'Lår, vänster', takenAt: at(2026, 10, 1, 7, 32), value: 55 },
      { metric: 'Arm "biceps"', takenAt: at(2026, 10, 2, 7, 32), value: 35 },
    ])
    expect(csv).toBe('takenAt,metric,value\n2026-10-01T07:32,"Lår, vänster",55.0\n2026-10-02T07:32,"Arm ""biceps""",35.0\n')
  })
```

4. Add after the `toCsv` block:

```ts
describe('csvRows', () => {
  const metrics = [
    { id: 'waist', name: 'Midja', createdAt: 0 },
    { id: 'abc', name: 'Bröst', createdAt: 0 },
  ]

  it('labels a built-in metric by its id and an own type by its name', () => {
    const rows = csvRows(
      [
        { metricId: 'weight', takenAt: 1, value: 82.4 },
        { metricId: 'waist', takenAt: 2, value: 92.5 },
        { metricId: 'abc', takenAt: 3, value: 104 },
      ],
      metrics,
    )
    expect(rows.map((r) => r.metric)).toEqual(['weight', 'waist', 'Bröst'])
  })
  it('keeps only the fields the file has columns for', () => {
    const entry = { id: 'e1', metricId: 'weight', takenAt: 1, value: 82.4, createdAt: 1, updatedAt: 1 }
    expect(csvRows([entry], metrics)).toEqual([{ metric: 'weight', takenAt: 1, value: 82.4 }])
  })
})
```

5. Add inside `describe('parseCsv — own format', …)`:

```ts
  it('reads the name of an own type, with or without a header', () => {
    const row = { metric: 'Bröst', takenAt: at(2026, 10, 1, 7, 32), value: 104.5 }
    expect(parseCsv('takenAt,metric,value\n2026-10-01T07:32,Bröst,104.5\n')).toEqual({ rows: [row], errors: [] })
    expect(parseCsv('2026-10-01T07:32,Bröst,104.5').rows).toEqual([row])
  })
  it('round-trips names with a comma or a quote', () => {
    const rows = [
      { metric: 'Lår, vänster', takenAt: at(2026, 10, 1, 7, 32), value: 55 },
      { metric: 'Arm "biceps"', takenAt: at(2026, 10, 2, 7, 32), value: 35 },
    ]
    expect(parseCsv(toCsv(rows))).toEqual({ rows, errors: [] })
  })
  it('reads a built-in metric under any of its names, in any case', () => {
    const csv = 'takenAt,metric,value\n2026-10-01T07:32,Vikt,82.4\n2026-10-01T07:33,MIDJA,92.5\n2026-10-01T07:34,Hip,101\n'
    expect(parseCsv(csv).rows.map((r) => r.metric)).toEqual(['weight', 'waist', 'hip'])
  })
  it('checks a value against the range of its kind', () => {
    const csv = 'takenAt,metric,value\n2026-10-01T07:32,Handled,16.5\n2026-10-01T07:33,weight,16.5\n2026-10-01T07:34,Handled,0.5\n'
    const result = parseCsv(csv)
    expect(result.rows).toEqual([{ metric: 'Handled', takenAt: at(2026, 10, 1, 7, 32), value: 16.5 }])
    expect(result.errors.map((e) => e.line)).toEqual([3, 4])
  })
  it('rejects an empty name and one over 30 characters', () => {
    const result = parseCsv(`takenAt,metric,value\n2026-10-01T07:32,,50\n2026-10-01T07:33,${'a'.repeat(31)},50\n`)
    expect(result.rows).toEqual([])
    expect(result.errors.map((e) => e.line)).toEqual([2, 3])
  })
  it('takes a name that is also an Object property as a plain name', () => {
    const csv = 'takenAt,metric,value\n2026-10-01T07:32,toString,50\n2026-10-01T07:33,constructor,50\n'
    expect(parseCsv(csv).rows.map((r) => r.metric)).toEqual(['toString', 'constructor'])
  })
```

6. Add inside `describe('parseCsv — legacy per-year sheets', …)`:

```ts
  it('ignores a column whose header is also an Object property', () => {
    expect(parseCsv('Datum;Vikt;constructor\n2024-01-03;82;5\n')).toEqual({
      rows: [{ metric: 'weight', takenAt: at(2024, 1, 3), value: 82 }],
      errors: [],
    })
  })
```

- [ ] **Step 2: Update and add the import tests**

In `src/db/entries.test.ts`:

1. The csv import becomes `import { csvRows, parseCsv, toCsv } from '../lib/csv'`. (`addMetric`, `deleteMetric` and `getMetrics` are already imported since Task 3.)
2. In `imports rows and skips duplicates, also on re-import`, the rows become:

```ts
    const rows = [
      { metric: 'weight', takenAt: at(1), value: 88.2 },
      { metric: 'weight', takenAt: at(2), value: 87.9 },
      { metric: 'weight', takenAt: at(2), value: 87.9 },
    ]
```

3. In both tests that call `toCsv(await getAllEntries())`, the call becomes `toCsv(csvRows(await getAllEntries(), await getMetrics()))`.
4. Add before the `clears everything…` test:

```ts
  it('imports an own type by its name and creates it once, whatever the case', async () => {
    const rows = [
      { metric: 'Bröst', takenAt: at(1), value: 104.5 },
      { metric: 'bröst', takenAt: at(2), value: 104 },
      { metric: 'BRÖST', takenAt: at(3), value: 103.5 },
    ]
    expect(await importRows(rows)).toEqual({ added: 3, skipped: 0 })
    const chest = (await getMetrics()).filter((m) => m.name.toLowerCase() === 'bröst')
    expect(chest.map((m) => m.name)).toEqual(['Bröst'])
    expect((await getEntries(chest[0].id)).map((e) => e.value)).toEqual([104.5, 104, 103.5])
  })

  it('imports into a type that already has that name', async () => {
    const chest = await addMetric('Bröst')
    await importRows([{ metric: 'bröst', takenAt: at(1), value: 104.5 }])
    expect(await db.metrics.count()).toBe(3)
    expect(await getEntries(chest.id)).toHaveLength(1)
  })

  it('brings back a deleted default type when a file has it', async () => {
    await deleteMetric('waist')
    await importRows([{ metric: 'waist', takenAt: at(1), value: 92.5 }])
    expect(await db.metrics.get('waist')).toMatchObject({ id: 'waist', name: 'Midja' })
    expect(await getEntries('waist')).toHaveLength(1)
  })

  it('restores a backup with own types into an empty app', async () => {
    const chest = await addMetric('Bröst')
    const thigh = await addMetric('Lår, vänster')
    await addEntry('weight', 82.4, at(1))
    await addEntry(chest.id, 104.5, at(2))
    await addEntry(thigh.id, 55, at(2))
    await addEntry('hip', 101.5, at(3))

    const csv = toCsv(csvRows(await getAllEntries(), await getMetrics()))
    await clearAllData()
    const result = parseCsv(csv)
    expect(result.errors).toEqual([])
    expect(await importRows(result.rows)).toEqual({ added: 4, skipped: 0 })

    const names = new Map((await getMetrics()).map((m) => [m.id, m.name]))
    expect([...names.values()].sort()).toEqual(['Bröst', 'Höft', 'Lår, vänster', 'Midja'])
    const restored = (await getAllEntries()).map((e) => `${names.get(e.metricId) ?? e.metricId} ${e.value}`).sort()
    expect(restored).toEqual(['Bröst 104.5', 'Höft 101.5', 'Lår, vänster 55', 'weight 82.4'])
  })
```

In `src/lib/demo.test.ts`, three lines change (the field is `metric` now):

```ts
const of = (metric: string) => rows.filter((r) => r.metric === metric)
```

```ts
      expect(isValidValue(r.metric, r.value)).toBe(true)
```

```ts
    for (const metric of ['weight', 'waist', 'hip']) {
      const series = of(metric)
```

In `src/io/csvFiles.test.ts`: both `{ metricId: 'weight', …}` rows become `{ metric: 'weight', …}`.

- [ ] **Step 3: Run them to see them fail**

Run: `npm test`
Expected: FAIL across `csv.test.ts`, `entries.test.ts`, `demo.test.ts`, `csvFiles.test.ts` (`csvRows is not a function`; rows still have `metricId`; `Bröst` rows are errors).

- [ ] **Step 4: Rewrite `src/lib/csv.ts`**

Replace the whole file with:

```ts
import { parseDayMonth, parseLocalIso, toLocalIso } from './dates'
import { parseDecimal } from './format'
import { BUILT_IN_IDS, cleanName, isValidValue, METRIC_NAME_MAX, WEIGHT_ID, type Metric, type MetricId } from './metrics'
import { sortByTime } from './stats'

export interface CsvRow {
  /** `weight`, `waist`, `hip`, or the name of one of the user's own types. `importRows` turns it into a metric id. */
  metric: string
  takenAt: number
  value: number
}

export interface CsvError {
  /** 1-based line number in the file */
  line: number
  text: string
}

export interface CsvParseResult {
  rows: CsvRow[]
  errors: CsvError[]
}

export const CSV_HEADER = 'takenAt,metric,value'

/** Entries as export rows: a built-in metric goes by its id, an own type by its name. */
export function csvRows(entries: { metricId: MetricId; takenAt: number; value: number }[], metrics: Metric[]): CsvRow[] {
  const names = new Map(metrics.map((m) => [m.id, m.name]))
  return entries.map((e) => ({
    metric: BUILT_IN_IDS.includes(e.metricId) ? e.metricId : (names.get(e.metricId) ?? e.metricId),
    takenAt: e.takenAt,
    value: e.value,
  }))
}

/** Quoted when it holds the separator or a quote; a quote inside is doubled. */
const csvCell = (cell: string) => (/[",]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)

/** Standard CSV: `,` separator, `.` decimals, local time without offset. */
export function toCsv(rows: CsvRow[]): string {
  const lines = sortByTime(rows).map((r) => `${toLocalIso(r.takenAt)},${csvCell(r.metric)},${r.value.toFixed(1)}`)
  return [CSV_HEADER, ...lines].join('\n') + '\n'
}

function detectDelimiter(line: string): string {
  if (line.includes(';')) return ';'
  if (line.includes('\t')) return '\t'
  return ','
}

/** Splits one line, honouring double quotes ("82,4" stays one cell; "" is an escaped quote). */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) {
      cells.push(cell.trim())
      cell = ''
    } else cell += ch
  }
  cells.push(cell.trim())
  return cells
}

/** Label → column index. */
type Columns = Record<string, number>
type Layout = { kind: 'own'; takenAt: number; metric: number; value: number } | { kind: 'legacy'; columns: Columns }

/**
 * Other words for the built-in metrics: the column headers in the per-year sheets, and our own ids in any case.
 * A Map, so that a cell like `constructor` isn't found on Object.prototype.
 */
const ALIASES = new Map<string, MetricId>([
  ['vikt', WEIGHT_ID],
  ['weight', WEIGHT_ID],
  ['midja', 'waist'],
  ['waist', 'waist'],
  ['höft', 'hip'],
  ['hip', 'hip'],
])
const LEGACY_DEFAULT: Columns = { [WEIGHT_ID]: 1 }

/** A `metric` cell as a label: an alias becomes the built-in id, anything else is the name of an own type. */
function labelOf(cell: string): string {
  const name = cleanName(cell)
  return ALIASES.get(name.toLocaleLowerCase('sv')) ?? name
}

function layoutFromHeader(header: string[]): Layout {
  const lower = header.map((h) => h.toLowerCase())
  const metric = lower.indexOf('metric')
  if (metric === -1) return { kind: 'legacy', columns: legacyColumns(lower) }
  return { kind: 'own', takenAt: lower.indexOf('takenat'), metric, value: lower.indexOf('value') }
}

function legacyColumns(lower: string[]): Columns {
  const columns: Columns = {}
  lower.forEach((h, i) => {
    const metric = ALIASES.get(h)
    if (i > 0 && metric) columns[metric] = i
  })
  return Object.keys(columns).length > 0 ? columns : LEGACY_DEFAULT
}

export interface ParseOptions {
  /** Year for `D/M` dates; Numbers exports per-year sheets without one. */
  year?: number
}

/**
 * Accepts our own export (`takenAt,metric,value`) and legacy per-year sheets (date first, then
 * Vikt/Midja/Höft by header, or weight in column 2 without one). Separator `,` `;` or tab; decimal `.` or `,`.
 * Knows nothing about the stored types: a row's `metric` is a label for `importRows` to resolve.
 */
export function parseCsv(text: string, { year }: ParseOptions = {}): CsvParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const firstContent = lines.find((l) => l.trim() !== '') ?? ''
  const delimiter = detectDelimiter(firstContent)
  const parseDate = (cell: string) => parseLocalIso(cell) ?? (year === undefined ? null : parseDayMonth(cell, year))
  const rows: CsvRow[] = []
  const errors: CsvError[] = []
  const lastMeasure = new Map<string, number>()
  let layout: Layout | null = null

  lines.forEach((raw, i) => {
    const cells = splitLine(raw, delimiter)
    if (cells.every((c) => c === '')) return

    if (layout === null) {
      const isHeader = parseDate(cells[0]) === null
      if (isHeader) {
        layout = layoutFromHeader(cells)
        return
      }
      // Without a header: our own format has the metric second, a sheet has the weight there.
      const own = cells.length >= 3 && cells[1] !== '' && parseDecimal(cells[1]) === null
      layout = own ? { kind: 'own', takenAt: 0, metric: 1, value: 2 } : { kind: 'legacy', columns: LEGACY_DEFAULT }
    }

    if (layout.kind === 'own') {
      const row = parseOwnRow(cells, layout)
      if (row) rows.push(row)
      else errors.push({ line: i + 1, text: raw })
      return
    }

    const sheetRows = parseLegacyRow(delimiter === ',' ? mergeDecimalComma(cells) : cells, layout.columns, parseDate(cells[0]))
    if (!sheetRows) {
      errors.push({ line: i + 1, text: raw })
      return
    }
    for (const row of sheetRows) {
      // Sheets repeat the last waist/hip measurement on every row; only a changed value is a new one.
      if (row.metric !== WEIGHT_ID && lastMeasure.get(row.metric) === row.value) continue
      lastMeasure.set(row.metric, row.value)
      rows.push(row)
    }
  })

  return { rows, errors }
}

/**
 * A comma-delimited legacy sheet with an unquoted decimal comma (`2024-01-03,82,4`) splits the value
 * into two cells; without this the weight would silently read as 82.
 */
function mergeDecimalComma(cells: string[]): string[] {
  if (/^\d+$/.test(cells[1] ?? '') && /^\d{1,2}$/.test(cells[2] ?? '')) return [cells[0], `${cells[1]},${cells[2]}`, ...cells.slice(3)]
  return cells
}

function parseOwnRow(cells: string[], layout: Extract<Layout, { kind: 'own' }>): CsvRow | null {
  const [dateCell, metricCell, valueCell] = [cells[layout.takenAt], cells[layout.metric], cells[layout.value]]
  if (dateCell === undefined || metricCell === undefined || valueCell === undefined) return null
  const takenAt = parseLocalIso(dateCell)
  const value = parseDecimal(valueCell)
  const metric = labelOf(metricCell)
  if (takenAt === null || value === null || metric === '' || metric.length > METRIC_NAME_MAX || !isValidValue(metric, value)) return null
  return { metric, takenAt, value }
}

/** One reading per filled metric column; null if the date or any filled cell is invalid, or nothing is filled. */
function parseLegacyRow(cells: string[], columns: Columns, takenAt: number | null): CsvRow[] | null {
  if (takenAt === null) return null
  const rows: CsvRow[] = []
  for (const [metric, index] of Object.entries(columns)) {
    const cell = cells[index] ?? ''
    if (cell === '') continue
    const value = parseDecimal(cell)
    if (value === null || !isValidValue(metric, value)) return null
    rows.push({ metric, takenAt, value })
  }
  return rows.length > 0 ? rows : null
}

/** Four-digit year in a per-year sheet's file name, e.g. `2024-År 2024 tracking.csv`. */
export function yearFromFileName(name: string): number | undefined {
  const m = name.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/)
  return m ? Number(m[0]) : undefined
}

export interface CsvSummary {
  count: number
  from: number
  to: number
}

export function summarize(rows: CsvRow[]): CsvSummary | null {
  if (rows.length === 0) return null
  const times = rows.map((r) => r.takenAt)
  return { count: rows.length, from: Math.min(...times), to: Math.max(...times) }
}
```

Three things differ from the old file beyond the label handling, all on purpose: the BOM is written `﻿` instead of as an invisible literal character; `lastMeasure` is a Map; `Columns` is a plain `Record`, which makes the `as [MetricId, number][]` cast unnecessary.

- [ ] **Step 5: Resolve labels on import**

In `src/db/entries.ts`, change the metrics import to

```ts
import { defaultMetrics, resolveLabel, roundValue, type Entry, type Metric, type MetricId } from '../lib/metrics'
```

and replace `importRows` (keep `identity` above it as it is) with:

```ts
/**
 * Adds CSV rows, skipping any row identical to an existing entry (or an earlier row), so re-import is safe.
 * A row names its metric by a label; a type that isn't stored yet is created along the way.
 */
export async function importRows(rows: CsvRow[]): Promise<{ added: number; skipped: number }> {
  return db.transaction('rw', db.entries, db.metrics, async () => {
    const metrics = await db.metrics.toArray()
    const created: Metric[] = []
    const seen = new Set((await db.entries.toArray()).map(identity))
    const now = Date.now()
    const toAdd: Entry[] = []
    for (const row of rows) {
      const resolved = resolveLabel(row.metric, metrics)
      if (resolved.create !== undefined) {
        const metric: Metric = { id: resolved.id, name: resolved.create, createdAt: now }
        created.push(metric)
        // Into the list at once, so the next row with this label finds it instead of creating it again.
        metrics.push(metric)
      }
      const key = identity({ metricId: resolved.id, takenAt: row.takenAt, value: row.value })
      if (seen.has(key)) continue
      seen.add(key)
      toAdd.push(makeEntry(resolved.id, row.value, row.takenAt, now))
    }
    await db.metrics.bulkAdd(created)
    await db.entries.bulkAdd(toAdd)
    return { added: toAdd.length, skipped: rows.length - toAdd.length }
  })
}
```

- [ ] **Step 6: The callers**

`src/lib/demo.ts`: the three `rows.push({ metricId: …` become `rows.push({ metric: …` (`'weight'`, `'waist'`, `'hip'` unchanged).

`src/db/demo.ts`: `importRows` now writes to `metrics`, so the surrounding transaction must include it:

```ts
  await db.transaction('rw', db.entries, db.settings, db.metrics, async () => {
```

`src/io/csvFiles.ts`: in `exportCsv`, rename the parameter and fix the comment (the body's `toCsv(entries)` becomes `toCsv(rows)`):

```ts
 * Rows are passed in rather than read here: iOS rejects `share()` once the tap has passed through
 * async work (the DB read), so everything before the share call must be synchronous.
 */
export async function exportCsv(rows: CsvRow[], now = Date.now()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const filename = `veyin-${toLocalIso(now).slice(0, 10)}.csv`
  const file = new File([toCsv(rows)], filename, { type: 'text/csv' })
```

`src/screens/SettingsScreen.tsx`:

```tsx
import { useAllEntries, useMetrics } from '../db/hooks'
```

```tsx
import { csvRows } from '../lib/csv'
```

under `const entries = useAllEntries()` add `const metrics = useMetrics()`, and the export call becomes:

```tsx
      await exportCsv(csvRows(entries, metrics))
```

(`csvRows` is synchronous, so the share sheet still opens inside the tap.)

- [ ] **Step 7: Run the checks**

Run: `npm test && npx tsc -b`
Expected: all pass. `grep -rn "metricId" src/lib/csv.ts src/lib/demo.ts` prints only the `csvRows` parameter lines.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: CSV export and import carry the user's own types" -m "An own type is written by its name; import creates the types it doesn't find, and a deleted Midja or Höft comes back with a file that has it." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Create a type from the sheet

**Files:**
- Modify: `src/components/Fields.tsx`, `src/components/MeasureSheet.tsx`, `src/i18n/sv.ts`

**Interfaces:**
- Consumes: `addMetric` (Task 3), `useMetrics` (Task 4), `nameProblem`, `METRIC_NAME_MAX` (Task 2).
- Produces: `TextField` in `src/components/Fields.tsx`; `sv.measures.newType`, `newTypeTitle`, `name`, `nameTaken`.

No unit test: the rules it relies on (`nameProblem`, `addMetric`) are tested in Tasks 2 and 3, and the test environment has no DOM. Checked by hand in Step 4.

- [ ] **Step 1: Strings**

In `src/i18n/sv.ts`, the `measures` block becomes:

```ts
  measures: {
    title: 'Mått',
    newMeasurement: 'Ny mätning',
    circumference: 'Omkrets',
    formTitle: 'Nya mått',
    newType: 'Skapa nytt mått',
    newTypeTitle: 'Nytt mått',
    name: 'Namn',
    nameTaken: 'Finns redan',
    thisYear: (delta: string) => `${delta} i år`,
    invalid: 'Ogiltigt värde',
  },
```

- [ ] **Step 2: A text field**

In `src/components/Fields.tsx`, add at the end:

```tsx
/** One-line text input. `error` shows under the field and marks it invalid; Enter calls `onEnter`. */
export function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  maxLength?: number
  error?: string
  autoFocus?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-muted">
        {props.label}
      </label>
      <input
        id={id}
        className={inputClass}
        value={props.value}
        maxLength={props.maxLength}
        autoFocus={props.autoFocus}
        autoComplete="off"
        enterKeyHint="done"
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && props.onEnter?.()}
      />
      {props.error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {props.error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: The name view**

Replace `src/components/MeasureSheet.tsx` with:

```tsx
import { useState } from 'react'
import { addEntries } from '../db/entries'
import { useMetrics } from '../db/hooks'
import { addMetric } from '../db/metrics'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidValue, METRIC_NAME_MAX, nameProblem, unitOf, type MetricId } from '../lib/metrics'
import { BottomSheet } from './BottomSheet'
import { DateTimeField } from './DateTimeField'
import { DecimalField, TextField } from './Fields'
import { PlusIcon } from './icons'

/** Names a new measurement type. */
function NewMetricForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const metrics = useMetrics()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const problem = nameProblem(name, metrics)

  const save = async () => {
    // `saving` keeps a double tap from creating the type twice; the second attempt would be rejected as taken.
    if (problem || saving) return
    setSaving(true)
    await addMetric(name)
    onSaved()
  }

  return (
    <>
      <TextField
        label={sv.measures.name}
        value={name}
        onChange={setName}
        onEnter={() => void save()}
        maxLength={METRIC_NAME_MAX}
        // Not while saving: the new type can reach `metrics` before this form closes, and would read as taken.
        error={problem === 'taken' && !saving ? sv.measures.nameTaken : undefined}
        autoFocus
      />
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onClick={onCancel} className="h-10 rounded-full bg-fill px-5 text-base font-semibold">
          {sv.common.cancel}
        </button>
        <button
          type="button"
          disabled={problem !== null || saving}
          onClick={() => void save()}
          className="h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink disabled:opacity-40"
        >
          {sv.common.save}
        </button>
      </div>
    </>
  )
}

/**
 * Batch form: fill whichever measurements you took; all get the same timestamp. A second view in the same sheet
 * names a new type; what was typed in the fields stays while it is open.
 */
export function MeasureSheet({ onClose }: { onClose: () => void }) {
  const metrics = useMetrics()
  const [texts, setTexts] = useState<Partial<Record<MetricId, string>>>({})
  const [takenAt, setTakenAt] = useState<number | null>(null)
  // With no types there is nothing to fill in, so the sheet opens on the name form.
  const [creating, setCreating] = useState(metrics.length === 0)

  const items = metrics.flatMap(({ id }) => {
    const text = texts[id] ?? ''
    if (text.trim() === '') return []
    const value = parseDecimal(text)
    return [{ metricId: id, value: value !== null && isValidValue(id, value) ? value : null }]
  })
  const canSave = items.length > 0 && items.every((i) => i.value !== null)

  const save = async () => {
    if (!canSave) return
    const valid = items.flatMap((i) => (i.value === null ? [] : [{ metricId: i.metricId, value: i.value }]))
    await addEntries(valid, takenAt ?? Date.now())
    onClose()
  }

  return (
    <BottomSheet title={creating ? sv.measures.newTypeTitle : sv.measures.formTitle} onClose={onClose}>
      {creating ? (
        <NewMetricForm onSaved={() => setCreating(false)} onCancel={() => (metrics.length === 0 ? onClose() : setCreating(false))} />
      ) : (
        <>
          {/* Scrolls when there are many types, so Spara stays on screen. The padding keeps the focus ring from being clipped. */}
          <div className="-mx-1 max-h-[40dvh] space-y-3 overflow-y-auto overscroll-contain px-1 py-1">
            {metrics.map(({ id, name }) => (
              <DecimalField
                key={id}
                label={name}
                unit={unitOf(id)}
                value={texts[id] ?? ''}
                onChange={(text) => setTexts((t) => ({ ...t, [id]: text }))}
                invalid={items.some((i) => i.metricId === id && i.value === null)}
              />
            ))}
          </div>
          <button type="button" onClick={() => setCreating(true)} className="mt-4 flex items-center gap-2 font-medium text-ember-600 dark:text-ember-400">
            <PlusIcon />
            {sv.measures.newType}
          </button>
          <div className="my-5 flex justify-center">
            <DateTimeField value={takenAt} onChange={setTakenAt} />
          </div>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void save()}
            className="mx-auto block h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink disabled:opacity-40"
          >
            {sv.common.save}
          </button>
        </>
      )}
    </BottomSheet>
  )
}
```

- [ ] **Step 4: Run the checks, then check by hand**

Run: `npm test && npx tsc -b`
Expected: all pass.

Then `npm run dev`, `http://localhost:5173/health-track/#/matt`:

- `+ Ny mätning` → fields (Höft, Midja), `+ Skapa nytt mått`, the date, `Spara`.
- Type `92,5` in Midja, tap `Skapa nytt mått`: the title reads `Nytt mått`, one `Namn` field with focus, `Avbryt` and a disabled `Spara`.
- Type `midja` → `Finns redan` under the field, `Spara` stays disabled. Same for `Vikt`.
- Type `Bröst` → `Spara` enabled. Tap it twice quickly: back on `Nya mått` with fields Bröst, Höft, Midja; Midja still reads `92,5`; the list has one Bröst.
- `Avbryt` in the name view returns to the fields without creating anything. Enter in the name field saves like `Spara`.
- Fill Bröst with `104,5`, `Spara`: Mått lists Bröst first, value `104,5 cm`, no summary line yet.
- Create five more types: the fields scroll inside the sheet and `Spara` stays visible.
- Both themes (Inställningar → Mörkt läge): the error text and the ember button are readable.

- [ ] **Step 5: Commit**

```bash
git add src/components/Fields.tsx src/components/MeasureSheet.tsx src/i18n/sv.ts
git commit -m "feat: create a measurement type from the Ny mätning sheet" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Delete a type from its detail screen

**Files:**
- Modify: `src/screens/DetailScreen.tsx`, `src/i18n/sv.ts`
- Create: `src/i18n/sv.test.ts`

**Interfaces:**
- Consumes: `deleteMetric` (Task 3); `useMetricName`, `WEIGHT_ID` (Task 4); `goBack` from `src/lib/router.ts`.
- Produces: `sv.detail.deleteMetric`, `sv.detail.confirmDeleteMetric(name: string, entries: number): string`.

- [ ] **Step 1: Write the failing test**

Create `src/i18n/sv.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sv } from './sv'

describe('sv', () => {
  it('says what deleting a type takes with it', () => {
    expect(sv.detail.confirmDeleteMetric('Bröst', 14)).toBe('Bröst och dess 14 mätningar raderas. Det går inte att ångra.')
    expect(sv.detail.confirmDeleteMetric('Bröst', 1)).toBe('Bröst och dess 1 mätning raderas. Det går inte att ångra.')
    expect(sv.detail.confirmDeleteMetric('Bröst', 0)).toBe('Bröst raderas.')
  })
  it('counts entries', () => {
    expect(sv.detail.count(1)).toBe('1 mätning')
    expect(sv.detail.count(3)).toBe('3 mätningar')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- src/i18n/sv.test.ts`
Expected: FAIL, `sv.detail.confirmDeleteMetric is not a function`.

- [ ] **Step 3: Strings**

In `src/i18n/sv.ts`, add above `export const sv`:

```ts
const countEntries = (n: number) => (n === 1 ? '1 mätning' : `${n} mätningar`)
```

In the `detail` block, replace the `count` line with `count: countEntries,` and add after `empty`:

```ts
    deleteMetric: 'Radera mått',
    confirmDeleteMetric: (name: string, entries: number) =>
      entries === 0 ? `${name} raderas.` : `${name} och dess ${countEntries(entries)} raderas. Det går inte att ångra.`,
```

Run: `npm test -- src/i18n/sv.test.ts`
Expected: PASS.

- [ ] **Step 4: The button and the confirm sheet**

In `src/screens/DetailScreen.tsx`, add the imports:

```tsx
import { BottomSheet } from '../components/BottomSheet'
```

```tsx
import { deleteMetric } from '../db/metrics'
```

After the `dismissUndo` line, add:

```tsx
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const removeMetric = async () => {
    // A second tap would go back twice, out of the app.
    if (deleting) return
    setDeleting(true)
    await deleteMetric(metricId)
    // The type is gone, so this screen has already given way to Mått; this takes the route back there as well.
    goBack()
  }
```

Between the closing `)}` of the `entries.length === 0 ? … : …` block and the `{editing && …}` line, add:

```tsx
      {metricId !== WEIGHT_ID && (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="mx-auto mt-10 block h-10 rounded-full bg-red-600 px-5 text-base font-semibold text-white"
        >
          {sv.detail.deleteMetric}
        </button>
      )}
```

and after the `{undo && ( … )}` block, before `</main>`:

```tsx
      {confirmingDelete && (
        <BottomSheet title={sv.detail.deleteMetric} onClose={() => setConfirmingDelete(false)}>
          <p className="mb-5 px-2 text-center text-muted">{sv.detail.confirmDeleteMetric(name, entries.length)}</p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => setConfirmingDelete(false)} className="h-10 rounded-full bg-fill px-5 text-base font-semibold">
              {sv.common.cancel}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void removeMetric()}
              className="h-10 rounded-full bg-red-600 px-5 text-base font-semibold text-white disabled:opacity-40"
            >
              {sv.common.delete}
            </button>
          </div>
        </BottomSheet>
      )}
```

- [ ] **Step 5: Run the checks, then check by hand**

Run: `npm test && npx tsc -b`
Expected: all pass.

Then `npm run dev`, `http://localhost:5173/health-track/#/matt`:

- Open Midja: `Radera mått` sits under the last group. Open Vikt from Hem: no such button.
- Tap it: the sheet reads `Midja och dess N mätningar raderas. Det går inte att ångra.` with `Avbryt` and `Radera`. `Avbryt` closes it and nothing changes.
- Tap `Radera` twice quickly: Mått shows, without Midja, and the app is still open (it went back once). The page scrolls again (the sheet's scroll lock is released).
- Create a type and open it before giving it a value: `Inga mätningar än` and `Radera mått`; the confirm reads `<namn> raderas.`.
- Reload the browser on the detail URL of a type, delete the type from there: it lands on Mått.
- Delete every type: the group holds only `+ Ny mätning`, which opens straight on `Nytt mått`, and `Avbryt` closes the sheet.
- Inställningar → `Exportera CSV` with an own type that has entries, then `Radera all data`, then import the file: the type and its entries are back, and so are Midja and Höft.

- [ ] **Step 6: Commit**

```bash
git add src/screens/DetailScreen.tsx src/i18n/sv.ts src/i18n/sv.test.ts
git commit -m "feat: delete a measurement type from its detail screen" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: The product spec, and the whole thing once more

**Files:**
- Modify: `docs/spec.md`

- [ ] **Step 1: Goals and non-goals**

Replace `- Track waist + hip separately (Mått tab).` with:

```markdown
- Track body measurements separately (Mått tab): Midja and Höft to start with, plus any types the user adds.
```

In the non-goals line, remove `Custom metrics UI, ` from the start and add `, renaming or reordering measurement types, units other than cm for them` before the final full stop.

- [ ] **Step 2: Data model**

Replace the paragraph `Metric definitions are code constants in v1 …` and the code block under it with:

````markdown
A metric id is a string. `weight` is a code constant (kg, valid 20–300, the metric Hem is built on). Every other metric is a measurement type: a row in the `metrics` table, always cm, valid 1–300. Step 0.1 everywhere.

```ts
type MetricId = string // 'weight', or the id of a measurement type
interface Metric { id: MetricId; name: string; createdAt: number }
// defaults: { id: 'waist', name: 'Midja' }, { id: 'hip', name: 'Höft' }; own types get a UUID
// 'Vikt' and the two default names live in src/i18n/sv.ts; a type is shown by its stored name
// weight dial range 60–100 is separate: DIAL_MIN/DIAL_MAX in src/lib/dialMath.ts
```
````

Replace the sentence that introduces the table (`Dexie DB `vagen` (…), version 1:`) with the same sentence ending `, version 2 (version 1 had no `metrics` table; the upgrade adds it with the two defaults):`, and add a row to the table:

```markdown
| `metrics` | `id` | `name`, `createdAt` (epoch ms) | — |
```

Add to the `Rules:` list:

```markdown
- A type's name: trimmed, 1–30 characters, unique among the types ignoring case, and not `Vikt`, `weight`, `waist` or `hip`.
- Deleting a type removes it and all its entries in one transaction. No undo.
- `Radera all data` also resets the types to Midja and Höft.
```

- [ ] **Step 3: Screens**

In the `Navigation:` paragraph, replace `All entries are held in memory from one live query.` with `All entries and measurement types are held in memory from one live query.` and `weight → Hem, waist/hip → Mått` with `weight → Hem, every measurement type → Mått`.

Replace the heading `### Detail screen (`/metric/:metricId`) — weight, waist, hip` with `### Detail screen (`/metric/:metricId`) — weight and every measurement type`, and add to the end of that section's list:

```markdown
- Not for weight: a red **Radera mått** button at the bottom → one confirm sheet (`Bröst och dess 14 mätningar raderas. Det går inte att ångra.`) → back to Mått.
- A route to an id that is neither `weight` nor an existing type shows the Mått tab.
```

Replace the two bullets under `### Mått` with:

```markdown
- Grouped list like Inställningar, group `Omkrets`: one row per measurement type, A–Ö (Swedish order) — name, and under it the change since the first entry this year with its unit (`−3,5 cm i år`, shown with two or more entries); current-year sparkline, latest value (`–` when there is none) and chevron right. Tap → detail screen.
- Last row **+ Ny mätning** (ember) → batch form: one decimal input per type (scrolling inside the sheet when there are many) + date-time (default now). Saves only filled fields, all with same `takenAt`.
- **Skapa nytt mått** in that sheet swaps it to a name view (`Namn`, `Avbryt`, `Spara`; `Finns redan` for a taken or reserved name). Saving creates the type and returns to the fields, which keep what was typed. With no types the sheet opens on the name view.
```

- [ ] **Step 4: CSV and testing**

In `### Export`, add under the code block's bullets:

```markdown
- `metric`: `weight`, `waist` and `hip` as those words; an own type by its name, quoted when it has `,` or `"` in it.
```

In `### Import`, replace the `- **Own format**: `takenAt,metric,value`.` bullet with:

```markdown
- **Own format**: `takenAt,metric,value`. `metric` is a label: `weight`/`vikt` → weight; otherwise the type with that id, then the type with that name (ignoring case); `waist`/`midja` and `hip`/`höft` bring Midja and Höft back if they were deleted; any other name creates a type. So an export restores every type on an empty app. Without a header a file is in this format when its second cell is not a number.
```

In `## Testing`, replace `Migration tests arrive with the first schema v2.` with `Schema v1 → v2 migration, creating and deleting measurement types.` and add `, own types and names that need quoting` after `export round-trip`.

- [ ] **Step 5: The whole thing once more**

Run: `npm test && npx tsc -b && npm run build`
Expected: all tests pass, no type errors, the build succeeds.

Run: `grep -rn "EntriesProvider\|MEASURE_METRIC_IDS\|isMetricId\|METRICS\b" src`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add docs/spec.md
git commit -m "docs: the spec describes own measurement types" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
