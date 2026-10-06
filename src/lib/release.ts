const major = (version: string) => Number.parseInt(version, 10)

/**
 * A new major version is, by the versioning rule in CLAUDE.md, one that may change the stored data or the
 * export format. `dev` and other non-numeric versions never warn.
 */
export function isMajorUpdate(current: string, incoming: string): boolean {
  return major(incoming) > major(current)
}
