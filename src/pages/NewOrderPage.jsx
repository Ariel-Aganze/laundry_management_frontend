import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Minus,
  NotebookPen,
  Phone,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingBasket,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { catalogApi, customersApi, ordersApi } from '../api'
import { PAYMENT_METHODS } from '../components/orders/RecordPaymentModal'
import ReceiptModal from '../components/orders/ReceiptModal'
import WhatsAppModal from '../components/orders/WhatsAppModal'
import { Button, Card, EmptyState, Input, Modal, PageLoader, Pills, Select, Textarea } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'
import { useDebounce } from '../hooks/useDebounce'
import { useSettings } from '../hooks/useSettings'
import { cn } from '../lib/cn'
import { todayISO, useFormat } from '../lib/format'

let lineSeq = 0
const newLine = (item, category) => ({
  key: ++lineSeq,
  service_item: item.id,
  name: item.name,
  category: category.name,
  normal_price: Number(item.normal_price),
  express_price: Number(item.express_price),
  service_type: 'NORMAL',
  quantity: 1,
  condition_notes: '',
  showNotes: false,
  custom_price: '',
  is_free: false,
})
/** Unit price shown for a line: catalog price, or the price typed in for Custom. */
const unitPrice = (line) =>
  line.service_type === 'CUSTOM'
    ? Number(line.custom_price || 0)
    : line.service_type === 'EXPRESS'
      ? line.express_price
      : line.normal_price
/** What the line adds to the order total (0 when offered for free). */
const lineTotal = (line) => (line.is_free ? 0 : unitPrice(line) * line.quantity)
const SERVICE_TYPES = ['NORMAL', 'EXPRESS', 'CUSTOM']

function Section({ number, title, children, action }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-base font-bold sm:text-lg">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-sm text-primary-ink">{number}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

/* ------------------------------------------------------------ Customer section */
function CustomerSection({ customer, setCustomer, newCustomer, setNewCustomer, errors }) {
  const { t } = useI18n()
  const settings = useSettings()
  const [term, setTerm] = useState('')
  const debounced = useDebounce(term, 300)
  const results = useQuery({
    queryKey: ['customers', 'lookup', debounced],
    queryFn: () => customersApi.list({ search: debounced, page_size: 6 }),
    enabled: debounced.trim().length >= 2 && !customer && !newCustomer,
  })

  if (customer) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-strong p-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{customer.full_name}</p>
          <p className="truncate text-sm text-muted">{customer.phone_number}</p>
        </div>
        <Button variant="secondary" size="sm" icon={X} onClick={() => setCustomer(null)}>
          {t('common.change')}
        </Button>
      </div>
    )
  }

  if (newCustomer) {
    const set = (key) => (e) => setNewCustomer({ ...newCustomer, [key]: e.target.value })
    return (
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('customers.fullName')} value={newCustomer.full_name} onChange={set('full_name')} error={errors.full_name} required autoFocus />
          <Input
            label={t('customers.phone')}
            type="tel"
            inputMode="tel"
            value={newCustomer.phone_number}
            onChange={set('phone_number')}
            error={errors.phone_number}
            hint={t('customers.phoneHint')}
            required
          />
        </div>
        <Select label={t('customers.language')} value={newCustomer.preferred_language || settings.default_language || 'en'} onChange={set('preferred_language')}>
          <option value="en">English</option>
          <option value="rw">Kinyarwanda</option>
        </Select>
        <div>
          <Button variant="ghost" size="sm" onClick={() => setNewCustomer(null)}>
            {t('newOrder.searchExisting')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input className="field rounded-full! pl-10" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('newOrder.searchCustomer')} autoFocus />
      </div>
      {results.data?.results?.length ? (
        <div className="flex flex-col gap-1.5">
          {results.data.results.map((c) => (
            <button key={c.id} type="button" onClick={() => setCustomer(c)} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-strong px-3.5 py-2.5 text-left hover:border-sky">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{c.full_name}</span>
                <span className="block truncate text-xs text-muted">{c.phone_number}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{t('customers.ordersCount', { count: c.orders_count })}</span>
            </button>
          ))}
        </div>
      ) : debounced.trim().length >= 2 && !results.isFetching ? (
        <p className="text-sm text-muted">{t('newOrder.noCustomerFound')}</p>
      ) : null}
      <Button
        variant="secondary"
        icon={UserPlus}
        onClick={() => {
          const looksLikePhone = /^[+\d\s-]{6,}$/.test(term.trim())
          setNewCustomer({
            full_name: looksLikePhone ? '' : term.trim(),
            phone_number: looksLikePhone ? term.trim() : '+250 ',
            preferred_language: settings.default_language || 'en',
          })
        }}
        className="self-start"
      >
        {t('newOrder.registerCustomer')}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------ Items section */
function ItemsSection({ lines, setLines }) {
  const { t } = useI18n()
  const f = useFormat()
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: catalogApi.tree, staleTime: 60_000 })
  const [categoryId, setCategoryId] = useState('')
  const categories = catalog.data || []
  const activeCategory = categories.find((c) => c.id === categoryId) || categories[0]

  const add = (item) => {
    setLines((current) => {
      const existing = current.find((l) => l.service_item === item.id && l.service_type === 'NORMAL' && !l.condition_notes && !l.is_free)
      if (existing) return current.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
      return [...current, newLine(item, activeCategory)]
    })
  }
  const update = (key, changes) => setLines((current) => current.map((l) => (l.key === key ? { ...l, ...changes } : l)))
  const remove = (key) => setLines((current) => current.filter((l) => l.key !== key))

  if (catalog.isLoading) return <PageLoader />
  if (!categories.length) return <EmptyState icon={ShoppingBasket} title={t('newOrder.noServices')} description={t('newOrder.noServicesHint')} />

  return (
    <div className="flex flex-col gap-4">
      <Pills size="sm" value={activeCategory?.id} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {(activeCategory?.items || []).map((item) => {
          const count = lines.filter((l) => l.service_item === item.id).reduce((s, l) => s + l.quantity, 0)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => add(item)}
              className={cn(
                'relative flex flex-col items-start gap-1 rounded-2xl border bg-surface-strong p-3 text-left transition active:scale-[0.98]',
                count ? 'border-sky ring-1 ring-sky' : 'border-line hover:border-sky/60',
              )}
            >
              <span className="font-semibold leading-tight">{item.name}</span>
              <span className="tabular text-xs text-muted">
                {f.money(item.normal_price)} · <span className="font-semibold text-ink">{t('serviceType.EXPRESS')}</span> {f.money(item.express_price)}
              </span>
              {count ? <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-sky text-xs font-bold text-white">{count}</span> : null}
            </button>
          )
        })}
      </div>

      {lines.length ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-semibold text-muted">{t('newOrder.selectedItems')}</p>
          {lines.map((line) => (
            <div key={line.key} className="rounded-2xl border border-line bg-surface-strong p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{line.name}</p>
                  <p className="truncate text-xs text-muted">{line.category}</p>
                </div>
                <button type="button" onClick={() => remove(line.key)} className="grid size-8 shrink-0 place-items-center rounded-full text-danger hover:bg-danger/10" aria-label={t('common.remove')}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-full border border-line bg-surface p-0.5">
                  {SERVICE_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => update(line.key, { service_type: type })} className={cn('h-8 rounded-full px-2.5 text-xs font-bold sm:px-3', line.service_type === type ? 'bg-primary text-primary-ink' : 'text-muted')}>
                      {t(`serviceType.${type}`)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => update(line.key, { quantity: Math.max(1, line.quantity - 1) })} className="grid size-9 place-items-center rounded-full border border-line bg-surface" aria-label="-">
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                    className="field tabular h-9 w-16 px-2! py-1! text-center font-semibold"
                    aria-label={t('orders.quantity')}
                  />
                  <button type="button" onClick={() => update(line.key, { quantity: line.quantity + 1 })} className="grid size-9 place-items-center rounded-full border border-line bg-surface" aria-label="+">
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="tabular text-xs text-muted">
                    {line.quantity} × {f.money(unitPrice(line))}
                  </p>
                  {line.is_free ? (
                    <p className="font-bold text-success">
                      <span className="tabular mr-1.5 text-xs font-medium text-muted line-through">{f.money(unitPrice(line) * line.quantity)}</span>
                      {t('orders.free')}
                    </p>
                  ) : (
                    <p className="tabular font-bold">{f.money(lineTotal(line))}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                {line.service_type === 'CUSTOM' ? (
                  <Input
                    className="w-full sm:w-56"
                    label={t('newOrder.customPrice')}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={line.custom_price}
                    onChange={(e) => update(line.key, { custom_price: e.target.value })}
                    error={line.custom_price === '' ? t('newOrder.customPriceHint') : null}
                    autoFocus
                  />
                ) : <span />}
                <label className={cn('flex cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition', line.is_free ? 'border-success bg-success/12 text-success' : 'border-line bg-surface')}>
                  <input type="checkbox" className="size-4 accent-[var(--success)]" checked={line.is_free} onChange={(e) => update(line.key, { is_free: e.target.checked })} />
                  {t('newOrder.freeOfCharge')}
                </label>
              </div>
              {line.showNotes || line.condition_notes ? (
                <Textarea className="mt-3" rows={2} placeholder={t('newOrder.conditionPlaceholder')} value={line.condition_notes} onChange={(e) => update(line.key, { condition_notes: e.target.value })} />
              ) : (
                <button type="button" onClick={() => update(line.key, { showNotes: true })} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-sky">
                  <NotebookPen className="size-3.5" /> {t('newOrder.addCondition')}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">{t('newOrder.tapToAdd')}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Success screen */
function OrderCreated({ order, receipt, onNew }) {
  const { t } = useI18n()
  const f = useFormat()
  const [showReceipt, setShowReceipt] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-3 text-2xl font-bold">{t('newOrder.created')}</h1>
        <p className="mt-1 text-sm text-muted">{order.customer.full_name}</p>
        <p className="mt-4 rounded-2xl bg-surface-strong py-3 text-2xl font-bold tracking-wide">{order.reference}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-2xl bg-surface-strong p-3">
            <p className="text-xs text-muted">{t('orders.total')}</p>
            <p className="tabular font-bold">{f.money(order.total_amount)}</p>
          </div>
          <div className="rounded-2xl bg-surface-strong p-3">
            <p className="text-xs text-muted">{t('orders.paid')}</p>
            <p className="tabular font-bold">{f.money(order.amount_paid)}</p>
          </div>
          <div className="rounded-2xl bg-surface-strong p-3">
            <p className="text-xs text-muted">{t('orders.balance')}</p>
            <p className={cn('tabular font-bold', Number(order.balance) > 0 && 'text-danger')}>{f.money(order.balance)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {t('orders.pickup')}: <span className="font-semibold text-ink">{f.date(order.pickup_date, { long: true })}</span>
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button icon={Printer} onClick={() => setShowReceipt(true)}>
            {t('newOrder.printReceipt')}
          </Button>
          <Button variant="success" icon={Phone} onClick={() => setShowWhatsApp(true)}>
            {t('newOrder.sendWhatsApp')}
          </Button>
          <Button variant="secondary" icon={Plus} onClick={onNew}>
            {t('newOrder.another')}
          </Button>
          <Link to={`/orders/${order.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface-strong text-sm font-semibold">
            <Receipt className="size-4" /> {t('newOrder.viewOrder')}
          </Link>
        </div>
      </Card>
      <ReceiptModal receiptId={receipt?.id} open={showReceipt} onClose={() => setShowReceipt(false)} onWhatsApp={() => { setShowReceipt(false); setShowWhatsApp(true) }} />
      <WhatsAppModal order={order} open={showWhatsApp} onClose={() => setShowWhatsApp(false)} initialTemplate="ORDER_RECEIVED" />
    </div>
  )
}

/* ------------------------------------------------------------ Page */
const emptyPayment = { amount: '', payment_method: 'CASH', method_other: '', transaction_reference: '' }

export default function NewOrderPage() {
  const { t } = useI18n()
  const f = useFormat()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { notify, fields } = useApiError()

  const [customer, setCustomer] = useState(location.state?.customer || null)
  const [newCustomer, setNewCustomer] = useState(null)
  const [lines, setLines] = useState([])
  const [dropOff, setDropOff] = useState(todayISO())
  const [pickup, setPickup] = useState(todayISO(2))
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState(emptyPayment)
  const [errors, setErrors] = useState({})
  const [duplicate, setDuplicate] = useState(null)
  const [review, setReview] = useState(false)
  const [created, setCreated] = useState(null)

  const total = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines])
  const quantity = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines])
  const paid = Math.min(Number(payment.amount || 0), total)
  const balance = Math.max(total - Number(payment.amount || 0), 0)

  const problems = []
  if (!customer && !(newCustomer?.full_name?.trim() && newCustomer?.phone_number?.trim().length > 5)) problems.push(t('newOrder.needCustomer'))
  if (!lines.length) problems.push(t('newOrder.needItems'))
  if (lines.some((l) => l.service_type === 'CUSTOM' && (l.custom_price === '' || Number(l.custom_price) < 0))) problems.push(t('newOrder.needCustomPrice'))
  if (pickup < dropOff) problems.push(t('errors.codes.pickup_before_dropoff'))
  if (Number(payment.amount || 0) > total) problems.push(t('errors.codes.payment_exceeds_balance'))
  if (payment.payment_method === 'OTHER' && Number(payment.amount) > 0 && !payment.method_other.trim()) problems.push(t('errors.codes.method_other_required'))

  const reset = () => {
    setCustomer(null)
    setNewCustomer(null)
    setLines([])
    setDropOff(todayISO())
    setPickup(todayISO(2))
    setNotes('')
    setPayment(emptyPayment)
    setErrors({})
    setCreated(null)
    window.scrollTo({ top: 0 })
  }

  const mutation = useMutation({
    mutationFn: () =>
      ordersApi.create({
        ...(customer ? { customer: customer.id } : { new_customer: newCustomer }),
        drop_off_date: dropOff,
        pickup_date: pickup,
        notes,
        items: lines.map((l) => ({
          service_item: l.service_item,
          service_type: l.service_type,
          quantity: l.quantity,
          condition_notes: l.condition_notes,
          is_free: l.is_free,
          ...(l.service_type === 'CUSTOM' ? { custom_price: l.custom_price } : {}),
        })),
        payment: Number(payment.amount) > 0 ? payment : null,
      }),
    onSuccess: (order) => {
      toast.success(t('newOrder.created'))
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setReview(false)
      setCreated(order)
      window.scrollTo({ top: 0 })
    },
    onError: (error) => {
      setReview(false)
      const data = error.response?.data
      if (data?.code === 'duplicate_phone' && data.existing_customer) {
        setDuplicate(data.existing_customer)
        return
      }
      const fe = fields(error)
      setErrors({ ...fe, ...(data?.errors?.new_customer ? fieldsFromNested(data.errors.new_customer) : {}) })
      notify(error)
    },
  })

  if (created) return <OrderCreated order={created} receipt={created.receipt} onNew={reset} />

  const setPay = (key) => (e) => setPayment({ ...payment, [key]: e.target.value })

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{t('nav.newOrder')}</h1>
        {lines.length || customer || newCustomer ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            {t('common.clear')}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section number={1} title={t('newOrder.customer')}>
            <CustomerSection customer={customer} setCustomer={setCustomer} newCustomer={newCustomer} setNewCustomer={setNewCustomer} errors={errors} />
          </Section>

          <Section number={2} title={t('newOrder.items')} action={quantity ? <span className="text-sm font-semibold text-muted">{t('orders.itemsCount', { count: quantity })}</span> : null}>
            <ItemsSection lines={lines} setLines={setLines} />
          </Section>

          <Section number={3} title={t('newOrder.dates')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="date" label={t('orders.dropOff')} value={dropOff} max={todayISO()} onChange={(e) => setDropOff(e.target.value)} />
              <Input type="date" label={t('orders.pickup')} value={pickup} min={dropOff} onChange={(e) => setPickup(e.target.value)} error={pickup < dropOff ? t('errors.codes.pickup_before_dropoff') : errors.pickup_date} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 7].map((d) => (
                <button key={d} type="button" onClick={() => setPickup(todayISO(d))} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', pickup === todayISO(d) ? 'border-transparent bg-primary text-primary-ink' : 'border-line bg-surface-strong')}>
                  {d === 0 ? t('periods.today') : d === 1 ? t('newOrder.tomorrow') : t('newOrder.inDays', { count: d })}
                </button>
              ))}
            </div>
            <Textarea className="mt-3" label={t('newOrder.orderNotes')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Section>

          <Section number={4} title={t('newOrder.payment')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('newOrder.amountReceived')} type="number" inputMode="decimal" min="0" step="any" value={payment.amount} onChange={setPay('amount')} placeholder="0" />
              <Select label={t('payments.method')} value={payment.payment_method} onChange={setPay('payment_method')}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>
                ))}
              </Select>
              {payment.payment_method === 'OTHER' ? <Input label={t('payments.methodOther')} value={payment.method_other} onChange={setPay('method_other')} /> : null}
              {payment.payment_method !== 'CASH' ? <Input label={t('payments.transactionRef')} value={payment.transaction_reference} onChange={setPay('transaction_reference')} /> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPayment({ ...payment, amount: String(total) })} disabled={!total} className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                {t('newOrder.payFull')}
              </button>
              <button type="button" onClick={() => setPayment({ ...payment, amount: String(Math.round(total / 2)) })} disabled={!total} className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                {t('payments.half')}
              </button>
              <button type="button" onClick={() => setPayment({ ...payment, amount: '' })} className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-semibold">
                {t('newOrder.payLater')}
              </button>
            </div>
          </Section>
        </div>

        {/* Summary (sticky on desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            {renderSummary(() => setReview(true))}
          </div>
        </aside>
      </div>

      {/* Mobile sticky total bar */}
      <div className="fixed inset-x-0 bottom-[76px] z-30 px-3 lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-primary py-2 pr-2 pl-5 text-primary-ink shadow-2xl">
          <div>
            <p className="text-[11px] opacity-70">{t('orders.itemsCount', { count: quantity })}</p>
            <p className="tabular text-lg font-bold leading-tight">{f.money(total)}</p>
          </div>
          <button type="button" disabled={problems.length > 0} onClick={() => setReview(true)} className="h-11 rounded-full bg-primary-ink px-5 text-sm font-bold text-primary disabled:opacity-40">
            {t('newOrder.review')}
          </button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />

      <Modal
        open={review}
        onClose={() => setReview(false)}
        title={t('newOrder.confirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReview(false)}>{t('common.back')}</Button>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()} icon={CheckCircle2}>{t('newOrder.save')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="rounded-2xl bg-surface-strong p-3">
            <p className="text-xs text-muted">{t('newOrder.customer')}</p>
            <p className="font-semibold">{customer?.full_name || newCustomer?.full_name}</p>
            <p className="text-muted">{customer?.phone_number || newCustomer?.phone_number}</p>
            {newCustomer ? <p className="mt-1 text-xs font-semibold text-sky">{t('newOrder.newCustomerBadge')}</p> : null}
          </div>
          <div className="divide-y divide-line rounded-2xl bg-surface-strong px-3">
            {lines.map((l) => (
              <div key={l.key} className="flex justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{l.quantity} × {l.name} <span className="text-xs text-muted">({t(`serviceType.${l.service_type}`)}{l.service_type === 'CUSTOM' ? ` · ${f.money(unitPrice(l))}` : ''})</span></p>
                  {l.condition_notes ? <p className="text-xs text-muted">{l.condition_notes}</p> : null}
                </div>
                <p className={cn('tabular shrink-0 font-semibold', l.is_free && 'text-success')}>{l.is_free ? t('orders.free') : f.money(lineTotal(l))}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-strong p-3">
              <p className="text-xs text-muted">{t('orders.dropOff')}</p>
              <p className="font-semibold">{f.date(dropOff)}</p>
            </div>
            <div className="rounded-2xl bg-surface-strong p-3">
              <p className="text-xs text-muted">{t('orders.pickup')}</p>
              <p className="font-semibold">{f.date(pickup)}</p>
            </div>
          </div>
          <Totals total={total} paid={paid} balance={balance} quantity={quantity} />
          {paid > 0 ? <p className="text-xs text-muted">{t('paymentMethod.' + payment.payment_method)}{payment.transaction_reference ? ` · ${payment.transaction_reference}` : ''}</p> : null}
        </div>
      </Modal>

      <Modal open={Boolean(duplicate)} onClose={() => setDuplicate(null)} title={t('newOrder.duplicateTitle')} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDuplicate(null)}>{t('common.cancel')}</Button>
            <Button onClick={() => { setCustomer(duplicate); setNewCustomer(null); setDuplicate(null) }}>{t('newOrder.useExisting')}</Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('newOrder.duplicateText')}</p>
        <div className="mt-3 rounded-2xl bg-surface-strong p-3">
          <p className="font-semibold">{duplicate?.full_name}</p>
          <p className="text-sm text-muted">{duplicate?.phone_number}</p>
        </div>
      </Modal>
    </div>
  )

  function renderSummary(onReview) {
    return (
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold">{t('newOrder.summary')}</h2>
        {lines.length ? (
          <div className="mb-3 max-h-64 divide-y divide-line overflow-y-auto scroll-thin">
            {lines.map((l) => (
              <div key={l.key} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{l.quantity} × {l.name}{l.service_type === 'EXPRESS' ? ' ⚡' : ''}{l.service_type === 'CUSTOM' ? ' ✎' : ''}</span>
                <span className={cn('tabular shrink-0 font-medium', l.is_free && 'text-success')}>{l.is_free ? t('orders.free') : f.money(lineTotal(l))}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted">{t('newOrder.tapToAdd')}</p>
        )}
        <Totals total={total} paid={paid} balance={balance} quantity={quantity} />
        {problems.length ? (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {problems.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        ) : null}
        <Button size="lg" className="mt-4 w-full" disabled={problems.length > 0} onClick={onReview}>
          {t('newOrder.review')}
        </Button>
      </Card>
    )
  }
}

function Totals({ total, paid, balance, quantity }) {
  const { t } = useI18n()
  const f = useFormat()
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-strong p-3 text-sm">
      <div className="flex justify-between"><span className="text-muted">{t('orders.items')}</span><span className="tabular">{quantity}</span></div>
      <div className="flex justify-between text-base font-bold"><span>{t('orders.total')}</span><span className="tabular">{f.money(total)}</span></div>
      <div className="flex justify-between"><span className="text-muted">{t('orders.paid')}</span><span className="tabular">{f.money(paid)}</span></div>
      <div className="flex justify-between font-semibold"><span>{t('orders.balance')}</span><span className={cn('tabular', balance > 0 && 'text-danger')}>{f.money(balance)}</span></div>
    </div>
  )
}

function fieldsFromNested(nested) {
  const out = {}
  for (const [field, value] of Object.entries(nested || {})) {
    const first = Array.isArray(value) ? value.find((v) => v?.message) : null
    if (first) out[field] = first.message
  }
  return out
}
