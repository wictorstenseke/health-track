import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DateField, dateLabel } from '../components/DateField'
import { HapticTap } from '../components/HapticTap'
import { CalendarIcon } from '../components/icons'
import { WeightScale } from '../components/WeightPicker'
import { YearChart, YearPillDot, yearPillClass, type ChartMark } from '../components/YearChart'
import { saveWeightForDay } from '../db/entries'
import { useEntries } from '../db/hooks'
import { sv } from '../i18n/sv'
import { chartDay } from '../lib/dates'
import { DEFAULT_WEIGHT, toDialValue } from '../lib/dialMath'
import { flyToMark } from '../lib/flight'
import { formatDeltaValue } from '../lib/format'
import type { Entry } from '../lib/metrics'
import { navigate } from '../lib/router'
import { latest, latestOnDay, yearSeries, yearStats } from '../lib/stats'
import { useDark } from '../lib/theme'

const SAVED_MS = 1500

// Memo: the dial re-renders Hem on every 0.1 kg step, and redrawing the Recharts chart each time made dragging stutter.
const YearCard = memo(function YearCard({ entries, mark }: { entries: Entry[]; mark?: ChartMark }) {
  const year = new Date().getFullYear()
  const series = yearSeries(entries, [year, year - 1, year - 2])
  const [hiddenYears, setHiddenYears] = useState<number[]>([])
  const toggleYear = (y: number) => setHiddenYears((h) => (h.includes(y) ? h.filter((x) => x !== y) : [...h, y]))
  const stats = yearStats(entries, year)
  const dark = useDark()
  return (
    <div className="relative rounded-[28px] bg-surface p-4 pb-2 shadow-card">
      {/* The whole card opens the detail screen. It lies under the content, so the year pills can be buttons of their own. */}
      <button
        type="button"
        onClick={() => navigate({ name: 'metric', metricId: 'weight' })}
        aria-label={sv.metrics.weight}
        className="absolute inset-0 rounded-[28px]"
      />
      <div className="pointer-events-none relative">
        <div className="flex items-center justify-between gap-2">
          {/* The years the chart draws, newest first; a tap hides or shows that year's line. */}
          <div className="pointer-events-auto flex gap-2">
            {series.map((s) => (
              <button
                key={s.year}
                type="button"
                onClick={() => toggleYear(s.year)}
                aria-pressed={!hiddenYears.includes(s.year)}
                className={`${yearPillClass} aria-[pressed=false]:opacity-40`}
              >
                <YearPillDot year={s.year} dark={dark} />
                {s.year}
              </button>
            ))}
          </div>
          {stats && stats.count >= 2 && <span className="pr-1 text-lg font-semibold tabular-nums">{formatDeltaValue(stats.change, 'kg')}</span>}
        </div>
        {series.length > 0 ? (
          <YearChart series={series.filter((s) => !hiddenYears.includes(s.year))} height={120} variant="card" mark={mark} />
        ) : (
          <p className="py-10 text-center text-sm text-faint">{sv.common.noData}</p>
        )}
      </div>
    </div>
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
  /** The weight just saved: the chart marks it and the number flies there. */
  const [landing, setLanding] = useState<{ value: number; takenAt: number } | null>(null)
  const numberRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(false), SAVED_MS)
    return () => clearTimeout(t)
  }, [justSaved])

  const last = latest(entries)
  // Whenever the latest weight changes (a save here, an edit on the detail screen) the dial follows it again.
  // Resetting only now, not right after saving, keeps the dial from jumping back while the data catches up.
  useEffect(() => setWeight(null), [last?.id, last?.value, last?.takenAt])

  // The chart draws the mark once the save is in the entries, so it sits where the point does. One flight per mark.
  const onMark = useCallback((el: SVGGElement | null) => {
    if (!el || el.dataset.flown || !numberRef.current) return
    el.dataset.flown = 'true'
    void flyToMark(numberRef.current, el).then(() => setLanding(null))
  }, [])
  const mark = useMemo(() => {
    if (!landing || !entries.some((e) => e.value === landing.value && e.takenAt === landing.takenAt)) return undefined
    return { x: chartDay(landing.takenAt), y: landing.value, ref: onMark }
  }, [landing, entries, onMark])

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
    const at = takenAt ?? Date.now()
    await saveWeightForDay(shown, at)
    setTakenAt(null)
    setJustSaved(true)
    // The card only charts this year and the two before.
    if (new Date(at).getFullYear() >= new Date().getFullYear() - 2) setLanding({ value: shown, takenAt: at })
  }

  return (
    <main className="pb-28">
      <section className="px-4 pt-(--screen-top)">
        {/* Radius = the chart card's 28px + this 8px padding, so the corners run parallel. */}
        <div className="hero-gradient rounded-[36px] p-2 pt-16">
          {/* 8px card border + 20px here = where "2026" starts inside the chart card. Same space above and below:
              the text sits centred between the card's top and the chart. */}
          <div className="px-5">
            <p className="text-xs leading-5 font-medium tracking-[0.14em] text-white/80 uppercase text-on-hero">{sv.home.welcome}</p>
            <h1 className="font-serif text-[3.5rem] leading-14 text-white text-on-hero">{name}</h1>
          </div>
          <div className="mt-16">
            <YearCard entries={entries} mark={mark} />
          </div>
        </div>
      </section>
      <section className="px-4 pt-4">
        {/* The date only shows when it isn't today, so a backdated save is never a surprise. */}
        <WeightScale
          value={shown}
          onChange={changeWeight}
          numberRef={numberRef}
          caption={takenAt !== null && dateLabel(takenAt)}
          start={
            <DateField
              value={takenAt}
              onChange={changeDate}
              label={sv.home.changeDate}
              // Tinted while backdated, next to the date shown under the number.
              className={`size-10 justify-center rounded-full ${takenAt === null ? 'bg-fill text-ink' : 'bg-ember-500/10 text-ember-600 dark:text-ember-400'}`}
            >
              <CalendarIcon />
            </DateField>
          }
        >
          <HapticTap onTap={() => void save()} disabled={saved}>
            <button
              type="button"
              disabled={saved}
              onClick={() => void save()}
              className="h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink transition-colors duration-300 disabled:bg-fill disabled:text-muted"
            >
              {saved ? sv.common.saved : sv.common.save}
            </button>
          </HapticTap>
        </WeightScale>
      </section>
    </main>
  )
}
