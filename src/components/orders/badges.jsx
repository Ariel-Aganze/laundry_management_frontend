import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, ChevronRight } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { useFormat } from '../../lib/format'
import { Badge } from '../ui'

const STATUS_TONES = {
  RECEIVED: 'neutral',
  PROCESSING: 'sky',
  READY: 'accent',
  COLLECTED: 'success',
  CANCELLED: 'danger',
}
const PAYMENT_TONES = { UNPAID: 'danger', PARTIALLY_PAID: 'warning', PAID: 'success' }

export function StatusBadge({ status }) {
  const { t } = useI18n()
  return <Badge tone={STATUS_TONES[status]}>{t(`status.${status}`)}</Badge>
}

export function PaymentBadge({ status }) {
  const { t } = useI18n()
  return <Badge tone={PAYMENT_TONES[status]}>{t(`paymentStatus.${status}`)}</Badge>
}

export function ServiceTypeBadge({ type }) {
  const { t } = useI18n()
  return <Badge tone={type === 'EXPRESS' ? 'dark' : 'neutral'}>{t(`serviceType.${type}`)}</Badge>
}

export function OverdueBadge() {
  const { t } = useI18n()
  return (
    <Badge tone="danger">
      <AlertTriangle className="size-3" /> {t('orders.overdue')}
    </Badge>
  )
}

/** Desktop table of orders. */
export function OrdersTable({ orders, compact }) {
  const { t } = useI18n()
  const f = useFormat()
  return (
    <div className="scroll-thin hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="pb-3 font-medium">{t('orders.reference')}</th>
            <th className="pb-3 font-medium">{t('orders.customer')}</th>
            {!compact && <th className="pb-3 text-right font-medium">{t('orders.items')}</th>}
            <th className="pb-3 text-right font-medium">{t('orders.total')}</th>
            {!compact && <th className="pb-3 text-right font-medium">{t('orders.paid')}</th>}
            <th className="pb-3 text-right font-medium">{t('orders.balance')}</th>
            <th className="pb-3 pl-4 font-medium">{t('orders.pickup')}</th>
            <th className="pb-3 font-medium">{t('orders.status')}</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-line align-middle hover:bg-surface-strong/60">
              <td className="py-3 pr-3">
                <Link to={`/orders/${order.id}`} className="font-semibold hover:underline">
                  {order.reference}
                </Link>
              </td>
              <td className="py-3 pr-3">
                <p className="font-medium">{order.customer.full_name}</p>
                <p className="text-xs text-muted">{order.customer.phone_number}</p>
              </td>
              {!compact && <td className="tabular py-3 text-right">{order.total_quantity}</td>}
              <td className="tabular py-3 text-right font-medium">{f.money(order.total_amount)}</td>
              {!compact && <td className="tabular py-3 text-right">{f.money(order.amount_paid)}</td>}
              <td className="tabular py-3 text-right">
                <span className={Number(order.balance) > 0 ? 'font-semibold text-danger' : 'text-muted'}>{f.money(order.balance)}</span>
              </td>
              <td className="py-3 pl-4 whitespace-nowrap">
                <span className={order.is_overdue ? 'font-semibold text-danger' : ''}>{f.date(order.pickup_date)}</span>
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment_status} />
                </div>
              </td>
              <td className="py-3 text-right">
                <Link to={`/orders/${order.id}`} className="inline-grid size-9 place-items-center rounded-full border border-line bg-surface-strong hover:bg-primary hover:text-primary-ink" aria-label={t('common.open')}>
                  <ChevronRight className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mobile card list of orders. */
export function OrderCards({ orders }) {
  const { t } = useI18n()
  const f = useFormat()
  return (
    <div className="flex flex-col gap-2.5 md:hidden">
      {orders.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`} className="rounded-2xl border border-line bg-surface-strong p-4 active:scale-[0.99] transition">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{order.customer.full_name}</p>
              <p className="text-xs text-muted">{order.reference}</p>
            </div>
            <p className="tabular shrink-0 font-bold">{f.money(order.total_amount)}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
            {order.is_overdue ? <OverdueBadge /> : null}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {f.date(order.pickup_date)}
            </span>
            {Number(order.balance) > 0 ? (
              <span className="font-semibold text-danger">
                {t('orders.balance')}: {f.money(order.balance)}
              </span>
            ) : (
              <span>{t('orders.itemsCount', { count: order.total_quantity })}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
