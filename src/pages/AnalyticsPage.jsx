import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import { BarsChart, Legend, ShareDonut, TrendChart, useChartColors } from '../components/charts'
import PeriodFilter, { PERIODS, periodParams } from '../components/PeriodFilter'
import { Card, CardHeader, EmptyState, PageHeader, PageLoader, Pills, StatCard } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useFormat } from '../lib/format'

const TABS = ['revenue', 'services', 'cashiers', 'customers', 'payments']

function Table({ head, rows }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-muted">
            {head.map((h, i) => (
              <th key={i} className={`pb-3 font-medium ${i > 0 ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-line">
              {row.map((cell, i) => (
                <td key={i} className={`py-2.5 ${i > 0 ? 'tabular text-right' : 'font-medium'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Revenue({ params }) {
  const { t } = useI18n()
  const f = useFormat()
  const c = useChartColors()
  const [group, setGroup] = useState('auto')
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'revenue', params, group], queryFn: () => reportsApi.revenue({ ...params, group_by: group }) })
  if (isLoading) return <PageLoader />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard title={t('dashboard.moneyReceived')} value={f.money(data.totals.money_received)} />
        <StatCard title={t('dashboard.orderValue')} value={f.money(data.totals.order_value)} tone="sky" />
        <StatCard title={t('dashboard.ordersCount')} value={data.totals.orders_count} tone="success" />
      </div>
      <Card>
        <CardHeader
          title={t('dashboard.revenueOverTime')}
          action={<Pills size="sm" value={group} onChange={setGroup} options={['auto', 'day', 'week', 'month'].map((g) => ({ value: g, label: t(`analytics.group.${g}`) }))} />}
        />
        <Legend items={[{ label: t('dashboard.moneyReceived'), color: c.series[0] }, { label: t('dashboard.orderValue'), color: c.series[1] }]} />
        <div className="mt-3">
          <TrendChart
            data={data.series}
            series={[{ key: 'money_received', label: t('dashboard.moneyReceived') }, { key: 'order_value', label: t('dashboard.orderValue') }]}
            xFormatter={f.shortDate}
            valueFormatter={(v) => f.money(v)}
            axisFormatter={(v) => f.money(v, { short: true }).replace(`${f.currency} `, '')}
            height={300}
          />
        </div>
      </Card>
      <Card>
        <CardHeader title={t('analytics.table')} />
        <Table
          head={[t('common.date'), t('dashboard.moneyReceived'), t('dashboard.orderValue'), t('nav.orders')]}
          rows={[...data.series].reverse().map((r) => [f.date(r.date), f.money(r.money_received), f.money(r.order_value), r.orders_count])}
        />
      </Card>
    </div>
  )
}

function Services({ params }) {
  const { t } = useI18n()
  const f = useFormat()
  const c = useChartColors()
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'services', params, 15], queryFn: () => reportsApi.services({ ...params, limit: 15 }) })
  if (isLoading) return <PageLoader />
  const [normal, express] = ['NORMAL', 'EXPRESS'].map((k) => data.service_types.find((s) => s.service_type === k))
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title={t('dashboard.popularItems')} subtitle={t('dashboard.byQuantity')} />
        {data.top_items.length ? <BarsChart data={data.top_items.slice(0, 10)} dataKey="quantity" nameKey="name" label={t('orders.quantity')} height={280} /> : <EmptyState title={t('common.noData')} />}
      </Card>
      <Card>
        <CardHeader title={t('dashboard.normalVsExpress')} />
        <Legend items={[{ label: t('serviceType.NORMAL'), color: c.series[0], value: normal.quantity }, { label: t('serviceType.EXPRESS'), color: c.series[1], value: express.quantity }]} />
        <ShareDonut data={[{ name: t('serviceType.NORMAL'), value: normal.quantity }, { name: t('serviceType.EXPRESS'), value: express.quantity }]} centerValue={normal.quantity + express.quantity} centerLabel={t('dashboard.itemsProcessed')} />
        <Table
          head={['', t('nav.orders'), t('analytics.value')]}
          rows={[
            [t('serviceType.NORMAL'), normal.orders, f.money(normal.value)],
            [t('serviceType.EXPRESS'), express.orders, f.money(express.value)],
          ]}
        />
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title={t('analytics.topItems')} />
        <Table head={[t('analytics.item'), t('orders.quantity'), t('nav.orders'), t('analytics.value')]} rows={data.top_items.map((r) => [`${r.name} · ${r.category}`, r.quantity, r.orders, f.money(r.value)])} />
      </Card>
      <Card>
        <CardHeader title={t('analytics.topCategories')} />
        <Table head={[t('analytics.category'), t('orders.quantity'), t('analytics.value')]} rows={data.top_categories.map((r) => [r.name, r.quantity, f.money(r.value)])} />
      </Card>
    </div>
  )
}

function Cashiers({ params }) {
  const { t } = useI18n()
  const f = useFormat()
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'cashiers', params], queryFn: () => reportsApi.cashiers(params) })
  if (isLoading) return <PageLoader />
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t('analytics.ordersPerCashier')} />
        <BarsChart data={data.results} dataKey="orders_count" nameKey="name" label={t('nav.orders')} />
      </Card>
      <Card>
        <Table
          head={[t('common.name'), t('nav.orders'), t('dashboard.orderValue'), t('dashboard.avgOrder'), t('analytics.paymentsRecorded'), t('dashboard.moneyReceived')]}
          rows={data.results.map((r) => [r.name, r.orders_count, f.money(r.orders_value), f.money(r.average_order_value), r.payments_count, f.money(r.payments_total)])}
        />
      </Card>
    </div>
  )
}

function Customers({ params }) {
  const { t } = useI18n()
  const f = useFormat()
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'customers', params], queryFn: () => reportsApi.customers(params) })
  if (isLoading) return <PageLoader />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title={t('analytics.totalCustomers')} value={data.total_customers} />
        <StatCard title={t('analytics.newCustomers')} value={data.new_customers} tone="sky" />
        <StatCard title={t('analytics.returning')} value={data.returning_customers} hint={t('analytics.returningInPeriod', { count: data.returning_customers_in_period })} tone="success" />
        <StatCard title={t('analytics.avgSpending')} value={f.money(data.average_spending, { short: true })} tone="warning" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('analytics.newCustomersOverTime')} />
          <BarsChart data={data.new_customers_series.map((r) => ({ ...r, label: f.shortDate(r.date) }))} dataKey="count" nameKey="label" label={t('analytics.newCustomers')} />
        </Card>
        <Card>
          <CardHeader title={t('analytics.topCustomers')} />
          <Table head={[t('common.name'), t('nav.orders'), t('analytics.spent')]} rows={data.top_customers.map((r) => [r.full_name, r.orders_count, f.money(r.total_spent)])} />
        </Card>
      </div>
    </div>
  )
}

function Payments({ params }) {
  const { t } = useI18n()
  const f = useFormat()
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'payments', params], queryFn: () => reportsApi.payments(params) })
  if (isLoading) return <PageLoader />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title={t('dashboard.moneyReceived')} value={f.money(data.money_received, { short: true })} hint={t('dashboard.paymentsCount', { count: data.payments_count })} />
        <StatCard title={t('dashboard.outstanding')} value={f.money(data.outstanding.balance, { short: true })} hint={t('dashboard.ordersWithBalance', { count: data.outstanding.orders })} tone="warning" />
        <StatCard title={t('analytics.reversed')} value={f.money(data.reversed.total, { short: true })} hint={t('analytics.reversedCount', { count: data.reversed.count })} tone="danger" />
        <StatCard title={t('analytics.oldestUnpaid')} value={data.outstanding.oldest_drop_off_date ? f.date(data.outstanding.oldest_drop_off_date) : '—'} tone="sky" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('analytics.byMethod')} />
          <BarsChart data={data.by_method.map((m) => ({ ...m, name: t(`paymentMethod.${m.payment_method}`), total: Number(m.total) }))} dataKey="total" nameKey="name" label={t('analytics.value')} valueFormatter={(v) => f.money(v)} axisFormatter={(v) => f.money(v, { short: true }).replace(`${f.currency} `, '')} />
          <Table head={[t('payments.method'), t('analytics.count'), t('analytics.value')]} rows={data.by_method.map((m) => [t(`paymentMethod.${m.payment_method}`), m.count, f.money(m.total)])} />
        </Card>
        <Card>
          <CardHeader title={t('analytics.aging')} subtitle={t('analytics.agingHint')} />
          <Table head={[t('analytics.age'), t('nav.orders'), t('orders.balance')]} rows={data.outstanding.aging.map((a) => [t(`analytics.ages.${a.bucket}`), a.orders, f.money(a.balance)])} />
        </Card>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState('revenue')
  const [period, setPeriod] = useState({ period: 'last_30_days' })
  const params = periodParams(period)
  const View = { revenue: Revenue, services: Services, cashiers: Cashiers, customers: Customers, payments: Payments }[tab]

  return (
    <div>
      <PageHeader title={t('nav.analytics')} subtitle={t('analytics.subtitle')} />
      <div className="mb-4 flex flex-col gap-3">
        <Pills value={tab} onChange={setTab} options={TABS.map((k) => ({ value: k, label: t(`analytics.tabs.${k}`) }))} />
        <PeriodFilter value={period} onChange={setPeriod} periods={PERIODS} />
      </div>
      <View params={params} />
      <p className="mt-4 text-xs text-muted">{t('dashboard.metricsNote')}</p>
    </div>
  )
}
