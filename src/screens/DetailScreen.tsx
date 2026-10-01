import { useCallback, useState } from 'react'
import { EntrySheet } from '../components/EntrySheet'
import { ChevronDownIcon, ChevronLeftIcon } from '../components/icons'
import { UndoToast } from '../components/UndoToast'
import { yearColor, YearChart } from '../components/YearChart'
import { restoreEntry } from '../db/entries'
import { useEntries } from '../db/hooks'
import { sv } from '../i18n/sv'
import { formatDate, formatDelta, formatMonthYear, formatNumber, formatRowDate, formatTime, formatValue } from '../lib/format'
import { METRICS, type Entry, type MetricId } from '../lib/metrics'
import { goBack } from '../lib/router'
import { bmi, latest, sameDateLastYear, withDeltas, yearSeries, yearsDescending, yearStats } from '../lib/stats'
import { useDark } from '../lib/theme'

export function DetailScreen({ metricId, heightCm }: { metricId: MetricId; heightCm: number | null }) {
  const entries = useEntries(metricId)
  const [hiddenYears, setHiddenYears] = useState<number[]>([])
  // Years whose accordion the user flipped away from its default (only the newest year starts open).
  const [flippedYears, setFlippedYears] = useState<number[]>([])
  const [editing, setEditing] = useState<Entry | null>(null)
  const [undo, setUndo] = useState<Entry | null>(null)
  const dismissUndo = useCallback(() => setUndo(null), [])
  const dark = useDark()

  const unit = METRICS[metricId].unit
  const years = yearsDescending(entries)
  const series = yearSeries(entries, years.filter((y) => !hiddenYears.includes(y)))
  const last = latest(entries)
  const comparison = sameDateLastYear(entries, Date.now())
  const toggle = (list: number[], y: number) => (list.includes(y) ? list.filter((x) => x !== y) : [...list, y])
  const toggleYear = (y: number) => setHiddenYears((h) => toggle(h, y))
  const isOpen = (y: number) => (y === years[0]) !== flippedYears.includes(y)

  type Month = { label: string; rows: Array<Entry & { delta: number | null }> }
  const entryYears: { year: number; count: number; months: Month[] }[] = []
  for (const row of withDeltas(entries).reverse()) {
    const year = new Date(row.takenAt).getFullYear()
    if (entryYears.at(-1)?.year !== year) entryYears.push({ year, count: 0, months: [] })
    const group = entryYears.at(-1)!
    group.count++
    const label = formatMonthYear(row.takenAt)
    const month = group.months.at(-1)
    if (month?.label === label) month.rows.push(row)
    else group.months.push({ label, rows: [row] })
  }

  return (
    <main className="px-4 pb-28">
      {/* Sticky: in the installed iOS app this button is the only way back (no browser back, no swipe). */}
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-canvas/85 px-4 pt-(--screen-top) pb-2 backdrop-blur-xl">
        <button type="button" onClick={goBack} aria-label={sv.common.back} className="-ml-2 rounded-full p-2">
          <ChevronLeftIcon />
        </button>
        <h1 className="text-3xl font-semibold tracking-tight">{sv.metrics[metricId]}</h1>
      </header>

      {entries.length === 0 ? (
        <p className="mt-16 text-center text-faint">{sv.detail.empty}</p>
      ) : (
        <>
          <section className="mt-3 rounded-[28px] bg-surface p-4 shadow-card">
            <div className="mb-2 flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => toggleYear(y)}
                  aria-pressed={!hiddenYears.includes(y)}
                  className="flex items-center gap-1.5 rounded-full bg-fill px-3 py-1 text-sm font-medium aria-[pressed=false]:opacity-40"
                >
                  <span className="size-2.5 rounded-full" style={{ background: yearColor(y, dark) }} />
                  {y}
                </button>
              ))}
            </div>
            <YearChart series={series} height={240} variant="full" />
          </section>

          <h2 className="mt-8 mb-2 px-1 text-lg font-semibold">{sv.detail.entries}</h2>
          <div className="space-y-3">
          {entryYears.map(({ year, count, months }) => {
            const open = isOpen(year)
            return (
              <section key={year} className="overflow-hidden rounded-[28px] bg-surface shadow-card">
                <button
                  type="button"
                  onClick={() => setFlippedYears((f) => toggle(f, year))}
                  aria-expanded={open}
                  aria-controls={`entries-${year}`}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: yearColor(year, dark) }} />
                    <span className="text-base font-semibold">{year}</span>
                    <span className="text-sm text-faint">{sv.detail.count(count)}</span>
                  </span>
                  <span className={`text-faint transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                  </span>
                </button>
                {/* 0fr → 1fr animates the height; inert keeps the collapsed rows out of tab order. */}
                <div
                  id={`entries-${year}`}
                  inert={!open}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    {months.map((m) => (
                      <div key={m.label}>
                        <h3 className="border-t border-line px-4 pt-3 pb-1 text-sm font-medium text-faint">{m.label}</h3>
                        <ul>
                          {m.rows.map((r) => (
                            <li key={r.id} className="border-t border-line first:border-t-0">
                              <button type="button" onClick={() => setEditing(r)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                                <span>
                                  {formatRowDate(r.takenAt)} <span className="text-sm text-faint">{formatTime(r.takenAt)}</span>
                                </span>
                                <span className="tabular-nums">
                                  <span className="font-semibold">{formatValue(r.value, unit)}</span>
                                  {r.delta !== null && <span className="ml-2 inline-block w-11 text-sm text-faint">{formatDelta(r.delta)}</span>}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
          </div>

          {(comparison || (metricId === 'weight' && heightCm && last)) && (
            <section className="mt-3 space-y-1 rounded-[28px] bg-surface p-4 text-base shadow-card">
              {metricId === 'weight' && heightCm && last && (
                <p>
                  <span className="font-semibold">{sv.detail.bmi}</span> {formatNumber(bmi(last.value, heightCm))}
                </p>
              )}
              {comparison && (
                <p className="text-ink/75">
                  {sv.detail.sameDate(
                    formatDate(comparison.date),
                    formatValue(comparison.then, unit),
                    formatNumber(comparison.now),
                    formatDelta(comparison.diff),
                  )}
                </p>
              )}
            </section>
          )}

          <section className="mt-3 overflow-hidden rounded-[28px] bg-surface shadow-card">
            <table className="w-full text-right text-sm tabular-nums">
              <thead className="text-faint">
                <tr>
                  <th className="py-3 pl-4 text-left font-medium">{sv.detail.year}</th>
                  <th className="font-medium">{sv.detail.first}</th>
                  <th className="font-medium">{sv.detail.latest}</th>
                  <th className="font-medium">{sv.detail.lowest}</th>
                  <th className="font-medium">{sv.detail.highest}</th>
                  <th className="pr-4 font-medium">{sv.detail.change}</th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => {
                  const s = yearStats(entries, y)
                  if (!s) return null
                  return (
                    <tr key={y} className="border-t border-line">
                      <td className="py-2.5 pl-4 text-left font-semibold">{y}</td>
                      <td>{formatNumber(s.first)}</td>
                      <td>{formatNumber(s.latest)}</td>
                      <td>{formatNumber(s.lowest)}</td>
                      <td>{formatNumber(s.highest)}</td>
                      <td className="pr-4 font-semibold">{formatDelta(s.change)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

        </>
      )}

      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} onDeleted={setUndo} />}
      {undo && (
        <UndoToast
          key={undo.id}
          message={sv.toast.deleted}
          // Only hide the toast once the restore succeeded; a failure surfaces through ErrorToast.
          onUndo={async () => {
            await restoreEntry(undo)
            setUndo(null)
          }}
          onDismiss={dismissUndo}
        />
      )}
    </main>
  )
}
