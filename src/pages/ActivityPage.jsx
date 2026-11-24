import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronDown, History } from 'lucide-react'
import { auditApi, usersApi } from '../api'
import { Card, EmptyState, Input, PageHeader, PageLoader, Pagination, SearchInput, Select } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'
import en from '../i18n/en'

const ACTIONS = Object.keys(en.audit.actions)
const ACTION_TONES = {
  danger: ['ORDER_CANCELLED', 'PAYMENT_REVERSED', 'USER_DEACTIVATED', 'LOGIN_FAILED', 'COLLECTION_REJECTED'],
  warning: ['PRICE_CHANGED', 'ORDER_UPDATED', 'COLLECTION_APPROVAL_REQUESTED', 'SETTINGS_UPDATED', 'PASSWORD_RESET'],
  success: ['PAYMENT_RECORDED', 'ORDER_CREATED', 'COLLECTION_APPROVED', 'USER_CREATED'],
}
const toneOf = (action) => Object.entries(ACTION_TONES).find(([, list]) => list.includes(action))?.[0] || 'neutral'
const DOT = { danger: 'bg-danger', warning: 'bg-warning', success: 'bg-success', neutral: 'bg-sky' }

function ValuesDiff({ oldValues, newValues }) {
  const keys = [...new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])]
  if (!keys.length) return null
  const show = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))
  return (
    <div className="mt-2 overflow-x-auto rounded-xl bg-surface-strong p-2.5 text-xs">
      <table className="w-full">
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="align-top">
              <td className="pr-3 py-0.5 font-semibold whitespace-nowrap">{k}</td>
              <td className="pr-3 py-0.5 text-danger line-through break-all">{oldValues && k in oldValues ? show(oldValues[k]) : ''}</td>
              <td className="py-0.5 text-success break-all">{newValues && k in newValues ? show(newValues[k]) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ActivityPage() {
  const { t } = useI18n()
  const f = useFormat()
  const [filters, setFilters] = useState({ user: '', action: '', date_from: '', date_to: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const debounced = useDebounce(search)
  useEffect(() => setPage(1), [filters, debounced])

  const params = { ...filters, search: debounced.trim(), page, page_size: 30 }
  const { data, isLoading } = useQuery({ queryKey: ['audit', params], queryFn: () => auditApi.list(params), placeholderData: keepPreviousData })
  const staff = useQuery({ queryKey: ['staff'], queryFn: usersApi.staff })
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  const link = (log) => {
    if (log.entity_type === 'Order') return `/orders/${log.entity_id}`
    if (log.entity_type === 'Customer') return `/customers/${log.entity_id}`
    return null
  }

  return (
    <div>
      <PageHeader title={t('nav.activity')} subtitle={t('activity.subtitle')} />
      <Card className="p-4 sm:p-5">
        <SearchInput value={search} onChange={setSearch} placeholder={t('activity.searchPlaceholder')} />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select label={t('activity.user')} value={filters.user} onChange={set('user')}>
            <option value="">{t('common.all')}</option>
            {(staff.data || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </Select>
          <Select label={t('activity.action')} value={filters.action} onChange={set('action')}>
            <option value="">{t('common.all')}</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{t(`audit.actions.${a}`)}</option>)}
          </Select>
          <Input type="date" label={t('common.from')} value={filters.date_from} onChange={set('date_from')} />
          <Input type="date" label={t('common.to')} value={filters.date_to} onChange={set('date_to')} />
        </div>
        <div className="mt-4">
          {isLoading ? (
            <PageLoader />
          ) : data?.results?.length ? (
            <>
              <ul className="divide-y divide-line">
                {data.results.map((log) => {
                  const href = link(log)
                  const hasDiff = log.old_values || log.new_values
                  return (
                    <li key={log.id} className="py-3">
                      <div className="flex items-start gap-3">
                        <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', DOT[toneOf(log.action)])} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="text-sm font-semibold">{t(`audit.actions.${log.action}`)}</p>
                            <p className="text-xs text-muted">{f.dateTime(log.created_at)}</p>
                          </div>
                          <p className="text-sm">{log.description}</p>
                          <p className="text-xs text-muted">
                            {log.user_name || t('activity.system')}{log.ip_address ? ` · ${log.ip_address}` : ''}
                            {href ? <> · <Link to={href} className="font-semibold text-sky">{t('common.open')}</Link></> : null}
                          </p>
                          {hasDiff ? (
                            <button type="button" onClick={() => setOpen(open === log.id ? null : log.id)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-sky">
                              {t('activity.changes')} <ChevronDown className={cn('size-3.5 transition', open === log.id && 'rotate-180')} />
                            </button>
                          ) : null}
                          {open === log.id ? <ValuesDiff oldValues={log.old_values} newValues={log.new_values} /> : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Pagination page={page} count={data.count} pageSize={30} onChange={setPage} />
            </>
          ) : (
            <EmptyState icon={History} title={t('activity.empty')} />
          )}
        </div>
      </Card>
    </div>
  )
}
