import { Dexie, type EntityTable } from 'dexie'
import type { Entry } from '../lib/metrics'

export type SettingKey = 'name' | 'heightCm' | 'lastExportAt'

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

  constructor() {
    super('vagen')
    this.version(1).stores({
      entries: 'id, metricId, takenAt, [metricId+takenAt]',
      settings: 'key',
    })
  }
}

export const db = new VagenDb()
