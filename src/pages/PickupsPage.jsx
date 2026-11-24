import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarCheck2, MessageCircle, Phone } from 'lucide-react'
import { reportsApi } from '../api'
import { PaymentBadge, StatusBadge } from '../components/orders/badges'
import WhatsAppModal from '../components/orders/WhatsAppModal'
import { Card, EmptyState, PageHeader, PageLoader, Pagination, Pills } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useSettings } from '../hooks/useSettings'
import { cn } from '../lib/cn'
import { daysBetween, todayISO, useFormat } from '../lib/format'

export default function PickupsPage() {
  const { t } = useI18n()
  const f = useFormat()
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'overdue' ? 'overdue' : 'upcoming'
  const [days, setDays] = useState(null)
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState(null)
  const windowDays = days ?? settings.upcoming_pickup_days ?? 3

  const upcoming = useQuery({
    queryKey: ['pickups', 'upcoming', windowDays, page],
    queryFn: () => reportsApi.pickups({ days: windowDays, page }),
    enabled: tab === 'upcoming',
    placeholderData: keepPreviousData,
  })
  const overdue = useQuery({
    queryKey: ['pickups', 'overdue', page],
    queryFn: () => reportsApi.overdue({ page }),
    placeholderData: keepPreviousData,
  })
  const query = tab === 'upcoming' ? upcoming : overdue
  const today = todayISO()

  const label = (order) => {
    const diff = daysBetween(today, order.pickup_date)
    if (diff === 0) return t('pickups.today')
    if (diff === 1) return t('pickups.tomorrow')
    if (diff > 1) return t('pickups.inDays', { count: diff })
    return t('pickups.daysLate', { count: -diff })
  }

  return (
    <div>
      <PageHeader title={t('nav.pickups')} subtitle={t('pickups.subtitle')} />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Pills
            value={tab}
            onChange={(v) => {
              setParams(v === 'overdue' ? { tab: 'overdue' } : {}, { replace: true })
              setPage(1)
            }}
            options={[
              { value: 'upcoming', label: t('pickups.upcoming') },
              { value: 'overdue', label: t('pickups.overdue'), count: overdue.data?.count },
            ]}
          />
          {tab === 'upcoming' ? (
            <Pills size="sm" value={windowDays} onChange={(v) => { setDays(v); setPage(1) }} options={[0, 1, 3, 7, 14].map((d) => ({ value: d, label: d === 0 ? t('periods.today') : t('pickups.nextDays', { count: d }) }))} />
          ) : null}
        </div>

        <div className="mt-4">
          {query.isLoading ? (
            <PageLoader />
          ) : query.data?.results?.length ? (
            <>
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {query.data.results.map((o) => (
                  <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-strong p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/orders/${o.id}`} className="min-w-0">
                        <p className="truncate font-semibold">{o.customer.full_name}</p>
                        <p className="text-xs text-muted">{o.reference}</p>
                      </Link>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', tab === 'overdue' ? 'bg-danger/12 text-danger' : 'bg-accent text-accent-ink')}>{label(o)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={o.status} />
                      <PaymentBadge status={o.payment_status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><p className="text-muted">{t('orders.pickup')}</p><p className="font-semibold">{f.date(o.pickup_date)}</p></div>
                      <div><p className="text-muted">{t('orders.total')}</p><p className="tabular font-semibold">{f.money(o.total_amount)}</p></div>
                      <div><p className="text-muted">{t('orders.balance')}</p><p className={cn('tabular font-semibold', Number(o.balance) > 0 && 'text-danger')}>{f.money(o.balance)}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:${o.customer.phone_number}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-xs font-semibold"><Phone className="size-3.5" /> {o.customer.phone_number}</a>
                      <button type="button" onClick={() => setMessage(o)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-success px-3.5 text-xs font-semibold text-white"><MessageCircle className="size-3.5" /> {t('pickups.remind')}</button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} count={query.data.count} onChange={setPage} />
            </>
          ) : (
            <EmptyState icon={CalendarCheck2} title={tab === 'overdue' ? t('pickups.noneOverdue') : t('pickups.noneUpcoming')} />
          )}
        </div>
      </Card>
      <WhatsAppModal order={message} open={Boolean(message)} onClose={() => setMessage(null)} />
    </div>
  )
}
