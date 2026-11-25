import { useId, type RefCallback } from 'react'
import { Area, ComposedChart, LabelList, Line, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_DAY_MAX, MONTH_START_DAYS } from '../lib/dates'
import { formatMonthInitial } from '../lib/format'
import type { ChartAxis } from '../lib/ranges'
import type { YearSeries } from '../lib/stats'
import { useDark } from '../lib/theme'

// SVG attributes, so the theme's colours are picked here rather than through CSS variables.
const AXIS_TICK = { light: { fontSize: 11, fill: '#a1a1aa' }, dark: { fontSize: 11, fill: '#71717a' } }
const SURFACE = { light: '#fff', dark: '#1e1e21' }
/** The mark's circles scale around their own centre. */
const MARK_ORIGIN = { transformBox: 'fill-box', transformOrigin: 'center' } as const

/** Current year in ember, older years as fading ink ghosts (light ink when `dark`). */
export function yearColor(year: number, dark: boolean, currentYear = new Date().getFullYear()): string {
  const age = currentYear - year
  const ink = dark ? '242 242 244' : '20 20 22'
  if (age <= 0) return '#ff5a1f'
  if (age === 1) return `rgb(${ink} / 0.55)`
  if (age === 2) return `rgb(${ink} / 0.3)`
  return `rgb(${ink} / 0.18)`
}

/** A year's pill: its line colour as a dot, then the year. A tap hides or shows that year's line. */
export const yearPillClass = 'flex items-center gap-1.5 rounded-full bg-fill px-3 py-1 text-sm font-medium'

export function YearPillDot({ year, dark }: { year: number; dark: boolean }) {
  return <span className="size-2.5 rounded-full" style={{ background: yearColor(year, dark) }} />
}

/**
 * Hem's card is too low for more than three values: the bottom, middle and top of a range that ends on whole numbers
 * around the data. An even span keeps the middle whole too.
 */
function wholeTicks(series: YearSeries[]): [number, number, number] | undefined {
  const values = series.flatMap((s) => s.points.map((p) => p.y))
  if (values.length === 0) return undefined
  const low = Math.floor(Math.min(...values) - 0.5)
  const high = Math.ceil(Math.max(...values) + 0.5)
  const top = high + ((high - low) % 2)
  return [low, (low + top) / 2, top]
}

/** A point to mark (chart coordinates), drawn hidden: `ref` gets a `<g>` of ring + dot to animate. */
export type ChartMark = { x: number; y: number; ref: RefCallback<SVGGElement> }

/**
 * `series` newest first. Lines are drawn oldest first so the current year sits on top.
 * The x axis is Jan–Dec unless `axis` gives another one (Hem's shorter ranges).
 */
export function YearChart({
  series,
  height,
  variant,
  mark,
  axis,
}: {
  series: YearSeries[]
  height: number
  variant: 'card' | 'full'
  mark?: ChartMark
  axis?: ChartAxis
}) {
  const currentYear = new Date().getFullYear()
  const full = variant === 'full'
  const theme = useDark() ? 'dark' : 'light'
  const fade = useId()
  const current = series.find((s) => s.year === currentYear)
  // Hem's card rounds the corners between points; the full chart keeps them exact.
  const curve = full ? 'linear' : 'monotone'
  const cardTicks = full ? undefined : wholeTicks(series)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          type="number"
          dataKey="x"
          domain={axis?.domain ?? [0, CHART_DAY_MAX]}
          ticks={axis?.ticks ?? MONTH_START_DAYS}
          tickFormatter={axis?.label ?? ((v: number) => formatMonthInitial(MONTH_START_DAYS.indexOf(v)))}
          interval={0}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK[theme]}
          allowDuplicatedCategory={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={cardTicks ? [cardTicks[0], cardTicks[2]] : ['dataMin - 1', 'dataMax + 1']}
          ticks={cardTicks}
          width={30}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK[theme]}
          tickFormatter={(v: number) => String(Math.round(v))}
        />
        <defs>
          <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff5a1f" stopOpacity={0.22} />
            <stop offset="1" stopColor="#ff5a1f" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Only the year in progress fades down to the axis, and under the other years' lines: one fade per line would turn to mud. */}
        {current && current.points.length > 1 && (
          <Area data={current.points} dataKey="y" type={curve} stroke="none" fill={`url(#${fade})`} fillOpacity={1} activeDot={false} isAnimationActive={false} />
        )}
        {[...series].reverse().map((s) => {
          const color = yearColor(s.year, theme === 'dark', currentYear)
          const lastIndex = s.points.length - 1
          return (
            <Line
              key={s.year}
              data={s.points}
              dataKey="y"
              type={curve}
              stroke={color}
              strokeWidth={s.year === currentYear ? 1.5 : 1.25}
              dot={s.points.length === 1 ? { r: 3, fill: color, stroke: color } : false}
              isAnimationActive={false}
            >
              {/* The year in progress ends in a dot on its latest value, like the sparklines on Mått; the white centre makes it easy to spot. */}
              {s.year === currentYear && (
                <LabelList
                  dataKey="y"
                  content={(props) =>
                    props.index === lastIndex ? (
                      <g>
                        <circle cx={Number(props.x)} cy={Number(props.y)} r={3.5} fill={color} />
                        <circle cx={Number(props.x)} cy={Number(props.y)} r={1.5} fill="#fff" />
                      </g>
                    ) : null
                  }
                />
              )}
            </Line>
          )
        })}
        {mark && (
          <ReferenceDot
            key={`${mark.x}:${mark.y}`}
            x={mark.x}
            y={mark.y}
            shape={({ cx, cy }) => (
              <g ref={mark.ref} opacity={0}>
                <circle cx={cx} cy={cy} r={4} fill="none" stroke="#ff5a1f" strokeWidth={1.5} style={MARK_ORIGIN} />
                <circle cx={cx} cy={cy} r={4} fill="#ff5a1f" stroke={SURFACE[theme]} strokeWidth={1.5} style={MARK_ORIGIN} />
              </g>
            )}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
