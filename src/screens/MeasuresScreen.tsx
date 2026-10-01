import { useState } from 'react'
import { MeasureSheet } from '../components/MeasureSheet'
import { Sparkline } from '../components/Sparkline'
import { useEntries } from '../db/hooks'
import { sv } from '../i18n/sv'
import { formatDelta, formatValue } from '../lib/format'
import { MEASURE_METRIC_IDS, METRICS, type MetricId } from '../lib/metrics'
import { navigate } from '../lib/router'
import { latest, pointsInYear, yearStats } from '../lib/stats'

function MetricCard({ metricId }: { metricId: MetricId }) {
  const entries = useEntries(metricId)
  const year = new Date().getFullYear()
  const last = latest(entries)
  const stats = yearStats(entries, year)
  return (
    <button
      type="button"
      onClick={() => navigate({ name: 'metric', metricId })}
      className="flex w-full items-center justify-between rounded-[28px] bg-surface p-5 text-left shadow-card"
    >
      <div>
        <p className="text-sm font-medium text-muted">{sv.metrics[metricId]}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{last ? formatValue(last.value, METRICS[metricId].unit) : '–'}</p>
        {stats && stats.count >= 2 && <p className="mt-0.5 text-sm text-muted">{sv.measures.thisYear(formatDelta(stats.change))}</p>}
      </div>
      <Sparkline values={pointsInYear(entries, year).map((p) => p.value)} />
    </button>
  )
}

export function MeasuresScreen() {
  const [measuring, setMeasuring] = useState(false)
  return (
    <main className="px-4 pt-(--screen-top) pb-28">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{sv.measures.title}</h1>
        <button type="button" onClick={() => setMeasuring(true)} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-on-ink">
          {sv.measures.measure}
        </button>
      </header>
      <div className="mt-5 space-y-3">
        {MEASURE_METRIC_IDS.map((id) => (
          <MetricCard key={id} metricId={id} />
        ))}
      </div>
      {measuring && <MeasureSheet onClose={() => setMeasuring(false)} />}
    </main>
  )
}
