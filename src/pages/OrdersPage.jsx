import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, SlidersHorizontal, X } from 'lucide-react'
import { ordersApi, usersApi } from '../api'
import { OrderCards, OrdersTable } from '../components/orders/badges'
import { Button, Card, EmptyState, Input, PageHeader, PageLoader, Pagination, Pills, SearchInput, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '../lib/cn'

const FILTER_KEYS = [
  'payment_status',
  'service_type',
  'created_by',
  'drop_off_from',
  'drop_off_to',
  'pickup_from',
  'pickup_to',
  'has_balance',
  'collection_approval',
  'overdue',
]
const STATUS_TABS = ['', 'RECEIVED', 'PROCESSING', 'READY', 'COLLECTED', 'CANCELLED']

export default function OrdersPage() {
  const { t } = useI18n()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [showFilters, setShowFilters] = useState(FILTER_KEYS.some((k) => params.get(k)))
  const debounced = useDebounce(search)

  const page = Number(params.get('page') || 1)
  const status = params.get('status') || ''
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']))
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in changes)) next.delete('page')
    next.delete('focus')
    setParams(next, { replace: true })
  }

  const query = useMemo(
    () => ({ ...filters, status, search: debounced.trim(), page, ordering: '-created_at' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, debounced],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['orders', query],
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData,
  })
  const staff = useQuery({ queryKey: ['staff'], queryFn: usersApi.staff, enabled: isAdmin && showFilters })

  return (
    <div>
      <PageHeader
        title={t('nav.orders')}
        subtitle={data ? t('orders.count', { count: data.count }) : null}
        actions={
          <div className="hidden sm:block">
            <Button icon={Plus} onClick={() => navigate('/orders/new')}>
              {t('nav.newOrder')}
            </Button>
          </div>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder={t('orders.searchPlaceholder')} className="flex-1" autoFocus={params.get('focus') === 'search'} />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('relative grid size-11 shrink-0 place-items-center rounded-full border border-line', showFilters ? 'bg-primary text-primary-ink' : 'bg-surface-strong')}
              aria-label={t('common.filters')}
            >
              <SlidersHorizontal className="size-4" />
              {activeFilterCount ? <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-sky text-[10px] font-bold text-white">{activeFilterCount}</span> : null}
            </button>
          </div>
          <Pills size="sm" value={status} onChange={(v) => update({ status: v })} options={STATUS_TABS.map((s) => ({ value: s, label: s ? t(`status.${s}`) : t('common.all') }))} />

          {showFilters ? (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface-strong p-3 md:grid-cols-4">
              <Select label={t('orders.paymentStatus')} value={filters.payment_status} onChange={(e) => update({ payment_status: e.target.value })}>
                <option value="">{t('common.all')}</option>
                {['UNPAID', 'PARTIALLY_PAID', 'PAID'].map((s) => (
                  <option key={s} value={s}>{t(`paymentStatus.${s}`)}</option>
                ))}
              </Select>
              <Select label={t('orders.serviceType')} value={filters.service_type} onChange={(e) => update({ service_type: e.target.value })}>
                <option value="">{t('common.all')}</option>
                <option value="NORMAL">{t('serviceType.NORMAL')}</option>
                <option value="EXPRESS">{t('serviceType.EXPRESS')}</option>
                <option value="CUSTOM">{t('serviceType.CUSTOM')}</option>
              </Select>
              <Select label={t('orders.balanceFilter')} value={filters.has_balance} onChange={(e) => update({ has_balance: e.target.value })}>
                <option value="">{t('common.all')}</option>
                <option value="true">{t('orders.withBalance')}</option>
                <option value="false">{t('orders.noBalance')}</option>
              </Select>
              <Select label={t('orders.approval')} value={filters.collection_approval} onChange={(e) => update({ collection_approval: e.target.value })}>
                <option value="">{t('common.all')}</option>
                {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                  <option key={s} value={s}>{t(`approval.${s}`)}</option>
                ))}
              </Select>
              <Input type="date" label={t('orders.dropOffFrom')} value={filters.drop_off_from} onChange={(e) => update({ drop_off_from: e.target.value })} />
              <Input type="date" label={t('orders.dropOffTo')} value={filters.drop_off_to} onChange={(e) => update({ drop_off_to: e.target.value })} />
              <Input type="date" label={t('orders.pickupFrom')} value={filters.pickup_from} onChange={(e) => update({ pickup_from: e.target.value })} />
              <Input type="date" label={t('orders.pickupTo')} value={filters.pickup_to} onChange={(e) => update({ pickup_to: e.target.value })} />
              {isAdmin ? (
                <Select label={t('orders.createdBy')} value={filters.created_by} onChange={(e) => update({ created_by: e.target.value })}>
                  <option value="">{t('common.all')}</option>
                  {(staff.data || []).map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </Select>
              ) : null}
              {activeFilterCount ? (
                <div className="col-span-2 flex items-end md:col-span-1">
                  <Button variant="ghost" icon={X} onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))}>
                    {t('common.clearFilters')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={cn('mt-4 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
          {isLoading ? (
            <PageLoader />
          ) : data?.results?.length ? (
            <>
              <OrdersTable orders={data.results} />
              <OrderCards orders={data.results} />
              <Pagination page={page} count={data.count} onChange={(p) => update({ page: String(p) })} />
            </>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={t('orders.empty')}
              description={search || status || activeFilterCount ? t('orders.emptyFiltered') : null}
              action={<Button icon={Plus} onClick={() => navigate('/orders/new')}>{t('nav.newOrder')}</Button>}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
