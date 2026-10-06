# Veyin

## Versioning

Semver in `package.json`, starting at 1.0.0 (the app is in real daily use). Keep it in check: when a change lands, say whether it warrants a bump (minor for features, patch for fixes, major for breaking data or export-format changes) and propose it. Bump with a `chore: release vX.Y.Z` commit and tag `vX.Y.Z`; push both.

A major bump makes installed apps show "export CSV first" next to the update button (`version.json`, `src/lib/release.ts`), so use it for anything that touches stored data (new Dexie version with a risky `.upgrade()`, changed export format) and not otherwise.
