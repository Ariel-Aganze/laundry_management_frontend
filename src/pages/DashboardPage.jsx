import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Coins,
  HandCoins,
  Plus,
  ShieldAlert,
  ShoppingBasket,
  Wallet,
} from 'lucide-react'
import { reportsApi } from '../api'
import { BarsChart, Legend, ShareDonut, TrendChart, useChartColors } from '../components/charts'
import { OrderCards, OrdersTable, PaymentBadge, StatusBadge } from '../components/orders/badges'
import PeriodFilter, { periodParams } from '../components/PeriodFilter'
import { Badge, Button, Card, CardHeader, EmptyState, PageLoader, StatCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useFormat } from '../lib/format'

function PickupList({ orders, emptyLabel, overdue }) {
  const { t } = useI18n()
  const f = useFormat()
  if (!orders?.length) return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>
  return (
    <ul className="flex flex-col divide-y divide-line">
      {orders.map((order) => (
        <li key={order.id}>
          <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{order.customer.full_name}</p>
              <p className="truncate text-xs text-muted">
                {order.reference} · {order.customer.phone_number}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-xs font-semibold ${overdue ? 'text-danger' : ''}`}>{f.date(order.pickup_date)}</p>
              {Number(order.balance) > 0 ? (
                <p className="tabular text-xs text-danger">{f.money(order.balance)}</p>
              ) : (
                <p className="text-xs text-success">{t('paymentStatus.PAID')}</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function RecentPayments({ payments }) {
  const { t } = useI18n()
  const f = useFormat()
  if (!payments?.length) return <p className="py-6 text-center text-sm text-muted">{t('payments.empty')}</p>
  return (
    <ul className="flex flex-col divide-y divide-line">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{p.customer_name}</p>
            <p className="truncate text-xs text-muted">
              {p.order_reference} · {t(`paymentMethod.${p.payment_method}`)} · {f.dateTime(p.received_at)}
            </p>
          </div>
          <p className={`tabular shrink-0 text-sm font-bold ${p.status === 'REVERSED' ? 'text-muted line-through' : ''}`}>{f.money(p.amount)}</p>
        </li>
      ))}
    </ul>
  )
}

function usePickupLists() {
  const pickups = useQuery({ queryKey: ['dashboard', 'pickups'], queryFn: () => reportsApi.pickups({ page_size: 6 }) })
  const overdue = useQuery({ queryKey: ['dashboard', 'overdue'], queryFn: () => reportsApi.overdue({ page_size: 6 }) })
  return { pickups, overdue }
}

/* ======================================================================== Cashier */
function CashierDashboard() {
  const { t } = useI18n()
  const { user } = useAuth()
  const f = useFormat()
  const navigate = useNavigate()
  const summary = useQuery({ queryKey: ['dashboard', 'summary', 'today'], queryFn: () => reportsApi.summary({ period: 'today' }) })
  const { pickups, overdue } = usePickupLists()
  const s = summary.data

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">{f.date(new Date(), { long: true })}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{t('dashboard.hello', { name: user.first_name || user.username })}</h1>
        </div>
        <div className="hidden sm:block">
          <Button size="lg" icon={Plus} onClick={() => navigate('/orders/new')}>
            {t('nav.newOrder')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title={t('dashboard.ordersToday')} value={s?.orders_count ?? 0} hint={t('dashboard.mine', { count: s?.my_orders_count ?? 0 })} icon={ShoppingBasket} loading={summary.isLoading} onClick={() => navigate('/orders')} />
        <StatCard title={t('dashboard.moneyToday')} value={f.money(s?.money_received, { short: true })} hint={t('dashboard.mineMoney', { amount: f.money(s?.my_money_received) })} icon={Wallet} loading={summary.isLoading} onClick={() => navigate('/payments')} />
        <StatCard title={t('dashboard.outstanding')} value={f.money(s?.outstanding_balance, { short: true })} hint={t('dashboard.ordersWithBalance', { count: s?.outstanding_orders_count ?? 0 })} icon={HandCoins} tone="warning" loading={summary.isLoading} onClick={() => navigate('/orders?has_balance=true')} />
        <StatCard title={t('dashboard.overdue')} value={s?.overdue_pickups_count ?? 0} hint={t('dashboard.upcomingCount', { count: s?.upcoming_pickups_count ?? 0 })} icon={AlertTriangle} tone="danger" loading={summary.isLoading} onClick={() => navigate('/pickups?tab=overdue')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={t('dashboard.upcomingPickups')} action={<Link to="/pickups" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>} />
          <PickupList orders={pickups.data?.results} emptyLabel={t('pickups.noneUpcoming')} />
        </Card>
        <Card>
          <CardHeader title={t('dashboard.overduePickups')} action={<Link to="/pickups?tab=overdue" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>} />
          <PickupList orders={overdue.data?.results} emptyLabel={t('pickups.noneOverdue')} overdue />
        </Card>
      </div>

      <Card>
        <CardHeader title={t('dashboard.recentOrders')} action={<Link to="/orders" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>} />
        {s?.recent_orders?.length ? (
          <>
            <OrdersTable orders={s.recent_orders} compact />
            <OrderCards orders={s.recent_orders} />
          </>
        ) : (
          <EmptyState icon={ClipboardList} title={t('orders.empty')} />
        )}
      </Card>
    </div>
  )
}

/* ======================================================================== Admin */
function AdminDashboard() {
  const { t } = useI18n()
  const f = useFormat()
  const navigate = useNavigate()
  const colors = useChartColors()
  const [period, setPeriod] = useState({ period: 'today' })
  const params = periodParams(period)
  // Trend charts need more than one day to be meaningful.
  const trendParams = ['today', 'yesterday'].includes(period.period) ? { period: 'last_7_days' } : params

  const summary = useQuery({ queryKey: ['dashboard', 'summary', params], queryFn: () => reportsApi.summary(params) })
  const revenue = useQuery({ queryKey: ['analytics', 'revenue', trendParams], queryFn: () => reportsApi.revenue(trendParams) })
  const services = useQuery({ queryKey: ['analytics', 'services', trendParams], queryFn: () => reportsApi.services({ ...trendParams, limit: 7 }) })
  const { pickups, overdue } = usePickupLists()
  const s = summary.data

  const types = services.data?.service_types || []
  const TYPES = ['NORMAL', 'EXPRESS', 'CUSTOM']
  const byType = Object.fromEntries(TYPES.map((k) => [k, types.find((x) => x.service_type === k) || { quantity: 0, value: 0 }]))
  const totalQty = TYPES.reduce((sum, k) => sum + (byType[k].quantity || 0), 0)
  const free = services.data?.free_items
  const pct = (v) => (totalQty ? Math.round((v / totalQty) * 100) : 0)

  if (summary.isLoading && !s) return <PageLoader />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{t('nav.dashboard')}</h1>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {s?.pending_collection_approvals ? (
        <button type="button" onClick={() => navigate('/orders?collection_approval=PENDING')} className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/12 p-4 text-left">
          <ShieldAlert className="size-5 shrink-0 text-warning" />
          <span className="flex-1 text-sm font-semibold">{t('dashboard.pendingApprovals', { count: s.pending_collection_approvals })}</span>
          <Badge tone="warning">{t('common.review')}</Badge>
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title={t('dashboard.moneyReceived')} value={f.money(s?.money_received, { short: true })} hint={t('dashboard.paymentsCount', { count: s?.payments_count ?? 0 })} icon={Wallet} onClick={() => navigate('/payments')} />
        <StatCard title={t('dashboard.outstanding')} value={f.money(s?.outstanding_balance, { short: true })} hint={t('dashboard.ordersWithBalance', { count: s?.outstanding_orders_count ?? 0 })} icon={HandCoins} onClick={() => navigate('/orders?has_balance=true')} />
        <StatCard title={t('dashboard.orderValue')} value={f.money(s?.order_value, { short: true })} hint={t('dashboard.orderValueHint')} icon={Coins} onClick={() => navigate('/analytics')} />
        <StatCard title={t('dashboard.ordersCount')} value={s?.orders_count ?? 0} hint={t('dashboard.upcomingOverdue', { upcoming: s?.upcoming_pickups_count ?? 0, overdue: s?.overdue_pickups_count ?? 0 })} icon={ShoppingBasket} onClick={() => navigate('/orders')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title={t('dashboard.revenueOverTime')}
            subtitle={t(`periods.${trendParams.period}`)}
            action={
              <Legend
                items={[
                  { label: t('dashboard.moneyReceived'), color: colors.series[0] },
                  { label: t('dashboard.orderValue'), color: colors.series[1] },
                ]}
              />
            }
          />
          <TrendChart
            data={revenue.data?.series || []}
            series={[
              { key: 'money_received', label: t('dashboard.moneyReceived') },
              { key: 'order_value', label: t('dashboard.orderValue') },
            ]}
            xFormatter={f.shortDate}
            valueFormatter={(v) => f.money(v)}
            axisFormatter={(v) => f.money(v, { short: true }).replace(`${f.currency} `, '')}
          />
        </Card>
        <Card>
          <CardHeader title={t('dashboard.popularItems')} subtitle={t('dashboard.byQuantity')} />
          {services.data?.top_items?.length ? (
            <BarsChart data={services.data.top_items} dataKey="quantity" nameKey="name" label={t('orders.quantity')} />
          ) : (
            <EmptyState title={t('common.noData')} />
          )}
        </Card>

        <Card>
          <CardHeader title={t('dashboard.normalVsExpress')} />
          <Legend items={TYPES.map((k, i) => ({ label: `${t(`serviceType.${k}`)}: ${pct(byType[k].quantity || 0)}%`, color: colors.series[i] }))} />
          <ShareDonut
            data={TYPES.map((k) => ({ name: t(`serviceType.${k}`), value: byType[k].quantity || 0 }))}
            centerValue={f.number(totalQty)}
            centerLabel={t('dashboard.itemsProcessed')}
          />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {TYPES.map((k) => (
              <div key={k} className="min-w-0 rounded-xl bg-surface-strong p-2.5">
                <p className="truncate text-muted">{t(`serviceType.${k}`)}</p>
                <p className="tabular truncate font-semibold">{f.money(byType[k].value, { short: true })}</p>
              </div>
            ))}
          </div>
          {free?.quantity ? (
            <p className="mt-2 rounded-xl bg-success/10 p-2.5 text-xs">
              <span className="font-semibold text-success">{t('analytics.freeItems')}</span>{' '}
              {t('analytics.freeItemsHint', { count: free.quantity, amount: f.money(free.value_given) })}
            </p>
          ) : null}
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title={t('dashboard.cashierActivity')} subtitle={t(`periods.${params.period}`)} />
          {/* Table from tablets up */}
          <div className="scroll-thin hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-3 font-medium">{t('common.name')}</th>
                  <th className="pb-3 text-right font-medium">{t('nav.orders')}</th>
                  <th className="pb-3 text-right font-medium">{t('dashboard.orderValue')}</th>
                  <th className="hidden pb-3 text-right font-medium lg:table-cell">{t('dashboard.avgOrder')}</th>
                  <th className="pb-3 text-right font-medium">{t('dashboard.moneyReceived')}</th>
                </tr>
              </thead>
              <tbody>
                {(s?.cashier_activity || []).map((row) => (
                  <tr key={row.user} className="border-t border-line">
                    <td className="py-3 pr-2">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted">{t(`roles.${row.role}`)}</p>
                    </td>
                    <td className="tabular py-3 text-right">{row.orders_count}</td>
                    <td className="tabular py-3 text-right whitespace-nowrap">{f.money(row.orders_value)}</td>
                    <td className="tabular hidden py-3 text-right whitespace-nowrap lg:table-cell">{f.money(row.average_order_value)}</td>
                    <td className="tabular py-3 text-right font-semibold whitespace-nowrap">{f.money(row.payments_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Compact rows on phones */}
          <div className="flex flex-col divide-y divide-line sm:hidden">
            {(s?.cashier_activity || []).map((row) => (
              <div key={row.user} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-semibold">{row.name}</p>
                  <p className="tabular shrink-0 font-bold">{f.money(row.payments_total)}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t(`roles.${row.role}`)} · {t('orders.count', { count: row.orders_count })} · {f.money(row.orders_value)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={t('dashboard.upcomingPickups')} action={<Link to="/pickups" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>} />
          <PickupList orders={pickups.data?.results} emptyLabel={t('pickups.noneUpcoming')} />
        </Card>
        <Card>
          <CardHeader
            title={t('dashboard.overduePickups')}
            action={<Link to="/pickups?tab=overdue" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>}
          />
          <PickupList orders={overdue.data?.results} emptyLabel={t('pickups.noneOverdue')} overdue />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title={t('dashboard.recentOrders')} action={<Link to="/orders" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>} />
          {s?.recent_orders?.length ? (
            <>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <tbody>
                    {s.recent_orders.map((o) => (
                      <tr key={o.id} className="border-t border-line first:border-t-0">
                        <td className="py-3">
                          <Link to={`/orders/${o.id}`} className="font-semibold hover:underline">{o.reference}</Link>
                          <p className="text-xs text-muted">{o.customer.full_name}</p>
                        </td>
                        <td className="tabular py-3 text-right font-medium">{f.money(o.total_amount)}</td>
                        <td className="py-3 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <StatusBadge status={o.status} />
                            <PaymentBadge status={o.payment_status} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <OrderCards orders={s.recent_orders} />
            </>
          ) : (
            <EmptyState icon={ClipboardList} title={t('orders.empty')} />
          )}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title={t('dashboard.recentPayments')} action={<Link to="/payments" className="text-sm font-semibold text-sky">{t('common.viewAll')}</Link>} />
          <RecentPayments payments={s?.recent_payments} />
        </Card>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted">
        <CalendarClock className="size-3.5" /> {t('dashboard.metricsNote')}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminDashboard /> : <CashierDashboard />
}
