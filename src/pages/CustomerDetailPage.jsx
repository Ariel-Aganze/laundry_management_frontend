import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, Pencil, Phone, Plus } from 'lucide-react'
import { customersApi } from '../api'
import { OrderCards, OrdersTable } from '../components/orders/badges'
import { Button, Card, CardHeader, EmptyState, InfoRow, PageHeader, PageLoader, Pagination, Pills, StatCard } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'
import { CustomerFormModal } from './CustomersPage'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const f = useFormat()
  const navigate = useNavigate()
  const [tab, setTab] = useState('orders')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)

  const customer = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.get(id) })
  const orders = useQuery({
    queryKey: ['customers', id, 'orders', page],
    queryFn: () => customersApi.orders(id, { page }),
    enabled: tab === 'orders',
    placeholderData: keepPreviousData,
  })
  const payments = useQuery({
    queryKey: ['customers', id, 'payments', page],
    queryFn: () => customersApi.payments(id, { page }),
    enabled: tab === 'payments',
    placeholderData: keepPreviousData,
  })

  if (customer.isLoading) return <PageLoader />
  const c = customer.data
  if (!c) return <EmptyState title={t('customers.notFound')} />

  return (
    <div>
      <PageHeader
        back={() => navigate(-1)}
        title={c.full_name}
        subtitle={c.phone_number}
        actions={
          <>
            <a href={`tel:${c.phone_number}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface-strong px-5 text-sm font-semibold"><Phone className="size-4" /> {t('customers.call')}</a>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>{t('common.edit')}</Button>
            <Button icon={Plus} onClick={() => navigate('/orders/new', { state: { customer: c } })}>{t('nav.newOrder')}</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title={t('nav.orders')} value={c.orders_count} icon={ClipboardList} />
        <StatCard title={t('customers.totalValue')} value={f.money(c.total_order_value, { short: true })} tone="sky" />
        <StatCard title={t('orders.paid')} value={f.money(c.amount_paid, { short: true })} tone="success" />
        <StatCard title={t('orders.balance')} value={f.money(c.outstanding_balance, { short: true })} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Pills
            size="sm"
            value={tab}
            onChange={(v) => {
              setTab(v)
              setPage(1)
            }}
            options={[
              { value: 'orders', label: t('nav.orders') },
              { value: 'payments', label: t('nav.payments') },
            ]}
            className="mb-4"
          />
          {tab === 'orders' ? (
            orders.isLoading ? (
              <PageLoader />
            ) : orders.data?.results?.length ? (
              <>
                <OrdersTable orders={orders.data.results} compact />
                <OrderCards orders={orders.data.results} />
                <Pagination page={page} count={orders.data.count} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon={ClipboardList} title={t('orders.empty')} />
            )
          ) : payments.isLoading ? (
            <PageLoader />
          ) : payments.data?.results?.length ? (
            <>
              <div className="divide-y divide-line">
                {payments.data.results.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{p.order_reference}</p>
                      <p className="text-xs text-muted">{t(`paymentMethod.${p.payment_method}`)} · {f.dateTime(p.received_at)} · {p.received_by_name}</p>
                    </div>
                    <p className={cn('tabular font-bold', p.status === 'REVERSED' && 'text-muted line-through')}>{f.money(p.amount)}</p>
                  </div>
                ))}
              </div>
              <Pagination page={page} count={payments.data.count} onChange={setPage} />
            </>
          ) : (
            <EmptyState title={t('payments.none')} />
          )}
        </Card>

        <Card>
          <CardHeader title={t('customers.details')} />
          <InfoRow label={t('customers.phone')}>{c.phone_number}</InfoRow>
          <InfoRow label={t('customers.language')}>{c.preferred_language === 'rw' ? 'Kinyarwanda' : 'English'}</InfoRow>
          <InfoRow label={t('customers.since')}>{f.date(c.created_at)}</InfoRow>
          <InfoRow label={t('customers.registeredBy')}>{c.created_by_name || '—'}</InfoRow>
          {c.notes ? <p className="mt-2 rounded-2xl bg-surface-strong p-3 text-sm">{c.notes}</p> : null}
        </Card>
      </div>

      <CustomerFormModal open={editing} onClose={() => setEditing(false)} customer={c} />
    </div>
  )
}
