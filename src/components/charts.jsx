import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../context/ThemeContext'

/**
 * Chart palette - three categorical slots in fixed order (blue, olive, magenta), validated
 * (lightness band, CVD separation) separately for each surface.
 */
export function useChartColors() {
  const { isDark } = useTheme()
  return isDark
    ? { series: ['#3d95ea', '#879d10', '#d55181'], grid: 'rgba(255,255,255,0.07)', axis: '#9aa1ab', ink: '#eceef1', surface: '#1a1d22', cursor: 'rgba(255,255,255,0.25)' }
    : { series: ['#2f86de', '#93ab12', '#c43b77'], grid: 'rgba(17,19,22,0.07)', axis: '#6b717b', ink: '#15171a', surface: '#f4f5f7', cursor: 'rgba(17,19,22,0.25)' }
}

function TooltipBox({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-line bg-surface-solid px-3.5 py-2.5 text-xs shadow-soft">
      {label != null ? <p className="mb-1.5 font-semibold">{labelFormatter ? labelFormatter(label) : label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
          <span className="text-muted">{entry.name}</span>
          <span className="tabular ml-auto pl-3 font-semibold">{valueFormatter ? valueFormatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  )
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-muted">
          <span className="size-2.5 rounded-full" style={{ background: item.color }} />
          {item.label}
          {item.value != null ? <span className="font-semibold text-ink">{item.value}</span> : null}
        </span>
      ))}
    </div>
  )
}

/** Time series of up to two money measures on one shared axis (no dual axis). */
export function TrendChart({ data, series, xFormatter, valueFormatter, axisFormatter, height = 260 }) {
  const c = useChartColors()
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.series[i]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c.series[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={xFormatter} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={axisFormatter} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            cursor={{ stroke: c.cursor, strokeWidth: 1 }}
            content={<TooltipBox labelFormatter={xFormatter} valueFormatter={valueFormatter} />}
          />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={c.series[i]}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: c.surface }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Single-series vertical bars (one hue - the title names the measure). */
export function BarsChart({ data, dataKey, nameKey, label, valueFormatter, axisFormatter, height = 260 }) {
  const c = useChartColors()
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fill: c.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} height={28} tickFormatter={(v) => (String(v).length > 7 ? `${String(v).slice(0, 6)}…` : v)} />
          <YAxis tickFormatter={axisFormatter} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={48} allowDecimals={false} />
          <Tooltip cursor={{ fill: c.grid }} content={<TooltipBox valueFormatter={valueFormatter} />} />
          <Bar dataKey={dataKey} name={label} fill={c.series[0]} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Two-part share (e.g. Normal vs Express) with a centre figure. */
export function ShareDonut({ data, centerValue, centerLabel, valueFormatter, height = 220 }) {
  const c = useChartColors()
  const total = data.reduce((sum, d) => sum + Number(d.value || 0), 0)
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<TooltipBox valueFormatter={valueFormatter} />} />
          <Pie
            data={total ? data : [{ name: '—', value: 1 }]}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={total ? 2 : 0}
            stroke={c.surface}
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {(total ? data : [{}]).map((_, i) => (
              <Cell key={i} fill={total ? c.series[i] : c.grid} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="tabular text-2xl font-bold">{centerValue}</p>
        <p className="text-xs text-muted">{centerLabel}</p>
      </div>
    </div>
  )
}
