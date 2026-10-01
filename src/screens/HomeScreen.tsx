import { memo, useEffect, useState } from 'react'
import { DateTimeField } from '../components/DateTimeField'
import { HapticTap } from '../components/HapticTap'
import { WeightDial } from '../components/WeightDial'
import { WeightValue } from '../components/WeightPicker'
import { YearChart } from '../components/YearChart'
import { saveWeightForDay } from '../db/entries'
import { useEntries } from '../db/hooks'
import { sv } from '../i18n/sv'
import { DEFAULT_WEIGHT, toDialValue } from '../lib/dialMath'
import { formatDelta } from '../lib/format'
import type { Entry } from '../lib/metrics'
import { navigate } from '../lib/router'
import { latest, latestOnDay, yearSeries, yearStats } from '../lib/stats'

const SAVED_MS = 1500

// Memo: the dial re-renders Hem on every 0.1 kg step, and redrawing the Recharts chart each time made dragging stutter.
const YearCard = memo(function YearCard({ entries }: { entries: Entry[] }) {
  const year = new Date().getFullYear()
  const series = yearSeries(entries, [year, year - 1, year - 2])
  const stats = yearStats(entries, year)
  return (
    <button
      type="button"
      onClick={() => navigate({ name: 'metric', metricId: 'weight' })}
      className="block w-full rounded-[28px] bg-white p-4 pb-2 text-left shadow-card"
    >
      <div className="flex items-baseline justify-between px-1">
        <span className="text-lg font-semibold">{year}</span>
        {stats && stats.count >= 2 && <span className="text-lg font-semibold tabular-nums">{formatDelta(stats.change)} kg</span>}
      </div>
      {series.length > 0 ? (
        <YearChart series={series} height={120} variant="card" />
      ) : (
        <p className="py-10 text-center text-sm text-zinc-400">{sv.common.noData}</p>
      )}
    </button>
  )
})

export function HomeScreen({ name }: { name: string }) {
  const entries = useEntries('weight')
  /** null = follow the latest weight */
  const [weight, setWeight] = useState<number | null>(null)
  /** null = now */
  const [takenAt, setTakenAt] = useState<number | null>(null)
  /** Brief confirmation, also for a backdated save (the date then resets to today). */
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(false), SAVED_MS)
    return () => clearTimeout(t)
  }, [justSaved])

  const last = latest(entries)
  // Whenever the latest weight changes (a save here, an edit on the detail screen) the dial follows it again.
  // Resetting only now, not right after saving, keeps the dial from jumping back while the data catches up.
  useEffect(() => setWeight(null), [last?.id, last?.value, last?.takenAt])

  const shown = weight ?? toDialValue(last?.value ?? DEFAULT_WEIGHT)
  const savedOnDay = latestOnDay(entries, takenAt ?? Date.now())
  const saved = justSaved || savedOnDay?.value === shown

  const changeWeight = (value: number) => {
    setWeight(value)
    setJustSaved(false)
  }
  const changeDate = (ts: number | null) => {
    setTakenAt(ts)
    setJustSaved(false)
  }

  const save = async () => {
    await saveWeightForDay(shown, takenAt ?? Date.now())
    setTakenAt(null)
    setJustSaved(true)
  }

  return (
    <main className="pb-28">
      <section className="px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        {/* Radius = the chart card's 28px + this 8px padding, so the corners run parallel. */}
        <div className="hero-gradient rounded-[36px] p-2 pt-10">
          <p className="text-center text-[15px] font-medium text-white/90">{sv.home.welcome}</p>
          <h1 className="mt-1 text-center text-[34px] font-semibold tracking-tight text-white">{name}</h1>
          <div className="mt-6">
            <YearCard entries={entries} />
          </div>
        </div>
      </section>
      <section className="px-4 pt-5">
        <WeightValue value={shown} onChange={changeWeight} />
        <div className="mt-1">
          <DateTimeField value={takenAt} onChange={changeDate} />
        </div>
        <div className="mt-5">
          <WeightDial value={shown} onChange={changeWeight} />
        </div>
        <div className="mt-5">
          <HapticTap onTap={() => void save()} disabled={saved}>
            <button
              type="button"
              disabled={saved}
              onClick={() => void save()}
              className="w-full rounded-full bg-ink py-4 text-lg font-semibold text-white shadow-card disabled:bg-ember-500"
            >
              {saved ? sv.common.saved : sv.common.save}
            </button>
          </HapticTap>
        </div>
      </section>
    </main>
  )
}
