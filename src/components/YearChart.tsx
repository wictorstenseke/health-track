import type { RefCallback } from 'react'
import { LabelList, Line, LineChart, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from 'recharts'
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart margin={{ top: 8, right: 36, bottom: 0, left: full ? 0 : 4 }}>
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
        {[...series].reverse().map((s) => {
          const color = yearColor(s.year, theme === 'dark', currentYear)
          const lastIndex = s.points.length - 1
          return (
            <Line
              key={s.year}
              data={s.points}
              dataKey="y"
              type="monotone"
              stroke={color}
              strokeWidth={s.year === currentYear ? 2.5 : 1.75}
              dot={s.points.length === 1 ? { r: 3, fill: color, stroke: color } : false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="y"
                content={(props) =>
                  props.index === lastIndex ? (
                    <text x={Number(props.x) + 6} y={Number(props.y)} dy={4} fontSize={11} fontWeight={600} fill={color}>
                      {s.year}
                    </text>
                  ) : null
                }
              />
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
      </LineChart>
    </ResponsiveContainer>
  )
}
