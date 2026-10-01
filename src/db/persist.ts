/** Asks the browser not to evict our storage. Best effort: unsupported or denied is fine. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // ignore
  }
}
