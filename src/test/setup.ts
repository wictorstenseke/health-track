import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { db } from '../db/db'

beforeEach(async () => {
  await db.entries.clear()
  await db.settings.clear()
})
