import { useI18n } from '../context/I18nContext'
import { todayISO } from '../lib/format'
import { Pills, Select } from './ui'

export const PERIODS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom']

/**
 * value: {period, start, end}
 * Phones get a compact dropdown; larger screens get wrapping pill buttons.
 */
export default function PeriodFilter({ value, onChange, periods = PERIODS }) {
  const { t } = useI18n()
  const change = (period) =>
    onChange(period === 'custom' ? { period, start: value.start || todayISO(-6), end: value.end || todayISO() } : { period })

  return (
    <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center">
      <Select className="sm:hidden" value={value.period} onChange={(e) => change(e.target.value)} aria-label={t('common.filters')}>
        {periods.map((p) => (
          <option key={p} value={p}>
            {t(`periods.${p}`)}
          </option>
        ))}
      </Select>
      <Pills
        size="sm"
        className="hidden flex-wrap overflow-visible! sm:flex"
        value={value.period}
        onChange={change}
        options={periods.map((p) => ({ value: p, label: t(`periods.${p}`) }))}
      />
      {value.period === 'custom' ? (
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="date"
            className="field h-10 min-w-0 flex-1 py-1! text-sm sm:w-40 sm:flex-none"
            value={value.start}
            max={value.end}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            aria-label={t('common.from')}
          />
          <span className="text-muted">–</span>
          <input
            type="date"
            className="field h-10 min-w-0 flex-1 py-1! text-sm sm:w-40 sm:flex-none"
            value={value.end}
            min={value.start}
            max={todayISO()}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            aria-label={t('common.to')}
          />
        </div>
      ) : null}
    </div>
  )
}

export function periodParams(value) {
  return value.period === 'custom' ? { period: 'custom', start: value.start, end: value.end } : { period: value.period }
}
