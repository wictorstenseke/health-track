import { DEMO_PROFILE, demoRows } from '../lib/demo'
import { db } from './db'
import { importRows } from './entries'

/**
 * Fills the app with an example profile and readings so a new user can try it. Ended by `clearAllData`.
 * Does nothing if there are entries already, so the demo never mixes with the user's own data.
 */
export async function startDemo(now = Date.now()): Promise<void> {
  await db.transaction('rw', db.entries, db.settings, db.metrics, async () => {
    if ((await db.entries.count()) > 0) return
    await importRows(demoRows(now))
    await db.settings.bulkPut([
      { key: 'demo', value: 1 },
      { key: 'heightCm', value: DEMO_PROFILE.heightCm },
      // Name last, as in setup: saving it switches the app from setup to home.
      { key: 'name', value: DEMO_PROFILE.name },
    ])
  })
}
