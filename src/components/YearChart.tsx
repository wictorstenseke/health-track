import { useId, type RefCallback } from 'react'
import { Area, ComposedChart, LabelList, Line, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_DAY_MAX, MONTH_START_DAYS } from '../lib/dates'
import { formatMonthInitial } from '../lib/format'
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

/** A year's pill: its line colour as a dot, then the year. Detail's pills toggle; Hem's are a legend. */
export const yearPillClass = 'flex items-center gap-1.5 rounded-full bg-fill px-3 py-1 text-sm font-medium'

export function YearPillDot({ year, dark }: { year: number; dark: boolean }) {
  return <span className="size-2.5 rounded-full" style={{ background: yearColor(year, dark) }} />
}

/** A point to mark (chart coordinates), drawn hidden: `ref` gets a `<g>` of ring + dot to animate. */
export type ChartMark = { x: number; y: number; ref: RefCallback<SVGGElement> }

/** `series` newest first. Lines are drawn oldest first so the current year sits on top. */
export function YearChart({
  series,
  height,
  variant,
  mark,
}: {
  series: YearSeries[]
  height: number
  variant: 'card' | 'full'
  mark?: ChartMark
}) {
  const currentYear = new Date().getFullYear()
  const full = variant === 'full'
  const theme = useDark() ? 'dark' : 'light'
  const fade = useId()
  const current = series.find((s) => s.year === currentYear)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ top: 8, right: 8, bottom: 0, left: full ? 0 : 4 }}>
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, CHART_DAY_MAX]}
          ticks={MONTH_START_DAYS}
          tickFormatter={(v: number) => formatMonthInitial(MONTH_START_DAYS.indexOf(v))}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK[theme]}
          allowDuplicatedCategory={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={['dataMin - 1', 'dataMax + 1']}
          hide={!full}
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
          <Area data={current.points} dataKey="y" type="linear" stroke="none" fill={`url(#${fade})`} fillOpacity={1} activeDot={false} isAnimationActive={false} />
        )}
        {[...series].reverse().map((s) => {
          const color = yearColor(s.year, theme === 'dark', currentYear)
          const lastIndex = s.points.length - 1
          return (
            <Line
              key={s.year}
              data={s.points}
              dataKey="y"
              type="linear"
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
