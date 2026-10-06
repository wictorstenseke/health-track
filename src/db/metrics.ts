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
