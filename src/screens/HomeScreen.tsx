import { memo, useEffect, useState } from 'react'
import { DateTimeField, dateTimeLabel } from '../components/DateTimeField'
import { HapticTap } from '../components/HapticTap'
import { CalendarIcon } from '../components/icons'
import { WeightScale } from '../components/WeightPicker'
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
      <section className="px-4 pt-(--screen-top)">
        {/* Radius = the chart card's 28px + this 8px padding, so the corners run parallel. */}
        <div className="hero-gradient rounded-[36px] p-2 pt-16">
          {/* 8px card border + 20px here = where "2026" starts inside the chart card. Same space above and below:
              the text sits centred between the card's top and the chart. */}
          <div className="px-5">
            <p className="text-base leading-5 font-medium text-white/90">{sv.home.welcome}</p>
            <h1 className="text-3xl leading-8 font-semibold tracking-tight text-white">{name}</h1>
          </div>
          <div className="mt-16">
            <YearCard entries={entries} />
          </div>
        </div>
      </section>
      <section className="px-4 pt-4">
        {/* The date only shows when it isn't today, so a backdated save is never a surprise. */}
        <WeightScale
          value={shown}
          onChange={changeWeight}
          caption={takenAt !== null && dateTimeLabel(takenAt)}
          start={
            <DateTimeField
              value={takenAt}
              onChange={changeDate}
              label={sv.home.changeDate}
              // Tinted while backdated, next to the date shown under the number.
              className={`size-10 justify-center rounded-full ${takenAt === null ? 'bg-zinc-100 text-ink' : 'bg-ember-500/10 text-ember-600'}`}
            >
              <CalendarIcon />
            </DateTimeField>
          }
        >
          <HapticTap onTap={() => void save()} disabled={saved}>
            <button
              type="button"
              disabled={saved}
              onClick={() => void save()}
              className="h-10 rounded-full bg-ink px-5 text-base font-semibold text-white transition-colors duration-300 disabled:bg-ember-500"
            >
              {saved ? sv.common.saved : sv.common.save}
            </button>
          </HapticTap>
        </WeightScale>
      </section>
    </main>
  )
}
