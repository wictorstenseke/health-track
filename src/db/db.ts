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
