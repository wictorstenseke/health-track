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
