import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  CheckCircle2,
  FileText,
  MessageCircle,
  Minus,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { catalogApi, ordersApi, paymentsApi } from '../api'
import { OverdueBadge, PaymentBadge, ServiceTypeBadge, StatusBadge } from '../components/orders/badges'
import ReceiptModal from '../components/orders/ReceiptModal'
import RecordPaymentModal from '../components/orders/RecordPaymentModal'
import WhatsAppModal from '../components/orders/WhatsAppModal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Badge, Button, Card, CardHeader, EmptyState, InfoRow, Input, Modal, PageHeader, PageLoader, Select, Textarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'
import { cn } from '../lib/cn'
import { todayISO, useFormat } from '../lib/format'

const NEXT_STATUS = { RECEIVED: 'PROCESSING', PROCESSING: 'READY', READY: 'COLLECTED' }

function useOrderMutation(orderId, fn, successMessage) {
  const queryClient = useQueryClient()
  const { notify } = useApiError()
  const { t } = useI18n()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      queryClient.setQueryData(['order', orderId], data)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (successMessage) toast.success(t(successMessage))
    },
    onError: notify,
  })
}

/* ------------------------------------------------------------ Edit modal */
function EditOrderModal({ order, open, onClose }) {
  const { t } = useI18n()
  const f = useFormat()
  const { isAdmin } = useAuth()
  const [form, setForm] = useState({})
  const [items, setItems] = useState([])
  const [addId, setAddId] = useState('')
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: catalogApi.tree, enabled: open && isAdmin })
  const allItems = (catalog.data || []).flatMap((c) => c.items.map((i) => ({ ...i, category: c.name })))
  const editableItems = isAdmin && order.status !== 'COLLECTED'

  useEffect(() => {
    if (open) {
      setForm({ pickup_date: order.pickup_date, drop_off_date: order.drop_off_date, notes: order.notes })
      setItems(
        order.items.map((i) => ({
          id: i.id,
          service_item: i.service_item,
          name: i.item_name_snapshot,
          service_type: i.service_type,
          quantity: i.quantity,
          condition_notes: i.condition_notes,
          unit_price: Number(i.unit_price),
          original_type: i.service_type,
        })),
      )
    }
  }, [open, order])

  const mutation = useOrderMutation(
    order.id,
    () => {
      const payload = { pickup_date: form.pickup_date, notes: form.notes }
      if (isAdmin) payload.drop_off_date = form.drop_off_date
      const itemsChanged =
        items.length !== order.items.length ||
        items.some((i) => {
          const o = order.items.find((x) => x.id === i.id)
          return !o || o.quantity !== i.quantity || o.service_type !== i.service_type
        })
      if (editableItems && itemsChanged) {
        payload.items = items.map((i) => ({
          ...(i.id ? { id: i.id } : {}),
          service_item: i.service_item,
          service_type: i.service_type,
          quantity: i.quantity,
          condition_notes: i.condition_notes,
        }))
      } else {
        payload.item_notes = items.filter((i) => i.id).map((i) => ({ id: i.id, condition_notes: i.condition_notes || '' }))
      }
      return ordersApi.update(order.id, payload)
    },
    'orders.updated',
  )

  const setItem = (idx, changes) => setItems((cur) => cur.map((i, n) => (n === idx ? { ...i, ...changes } : i)))
  const addItem = () => {
    const found = allItems.find((i) => i.id === addId)
    if (!found) return
    setItems((cur) => [
      ...cur,
      { service_item: found.id, name: found.name, service_type: 'NORMAL', quantity: 1, condition_notes: '', unit_price: Number(found.normal_price), normal: Number(found.normal_price), express: Number(found.express_price) },
    ])
    setAddId('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orders.editOrder')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={mutation.isPending} disabled={!items.length} onClick={() => mutation.mutate(undefined, { onSuccess: onClose })}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {isAdmin ? <Input type="date" label={t('orders.dropOff')} value={form.drop_off_date || ''} max={todayISO()} onChange={(e) => setForm({ ...form, drop_off_date: e.target.value })} /> : null}
          <Input type="date" label={t('orders.pickup')} value={form.pickup_date || ''} min={form.drop_off_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} />
        </div>
        <Textarea label={t('newOrder.orderNotes')} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />

        <div>
          <p className="mb-2 text-sm font-semibold">{t('orders.items')}</p>
          {!isAdmin ? <p className="mb-2 text-xs text-muted">{t('orders.cashierEditHint')}</p> : null}
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={item.id || `new-${idx}`} className="rounded-2xl border border-line bg-surface-strong p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.name} {!item.id ? <Badge tone="sky">{t('common.new')}</Badge> : null}</p>
                  {editableItems ? (
                    <div className="flex items-center gap-1.5">
                      <Select value={item.service_type} onChange={(e) => setItem(idx, { service_type: e.target.value })} className="w-32">
                        <option value="NORMAL">{t('serviceType.NORMAL')}</option>
                        <option value="EXPRESS">{t('serviceType.EXPRESS')}</option>
                      </Select>
                      <button type="button" className="grid size-9 place-items-center rounded-full border border-line" onClick={() => setItem(idx, { quantity: Math.max(1, item.quantity - 1) })}><Minus className="size-4" /></button>
                      <span className="tabular w-8 text-center font-semibold">{item.quantity}</span>
                      <button type="button" className="grid size-9 place-items-center rounded-full border border-line" onClick={() => setItem(idx, { quantity: item.quantity + 1 })}><Plus className="size-4" /></button>
                      <button type="button" className="grid size-9 place-items-center rounded-full text-danger hover:bg-danger/10" onClick={() => setItems((cur) => cur.filter((_, n) => n !== idx))} aria-label={t('common.remove')}><Trash2 className="size-4" /></button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted">{item.quantity} × {f.money(item.unit_price)}</span>
                  )}
                </div>
                <Textarea className="mt-2" rows={1} placeholder={t('newOrder.conditionPlaceholder')} value={item.condition_notes || ''} onChange={(e) => setItem(idx, { condition_notes: e.target.value })} />
              </div>
            ))}
          </div>
          {editableItems ? (
            <div className="mt-3 flex gap-2">
              <Select value={addId} onChange={(e) => setAddId(e.target.value)} className="flex-1">
                <option value="">{t('orders.addItem')}</option>
                {allItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.category} · {i.name}</option>
                ))}
              </Select>
              <Button variant="secondary" icon={Plus} disabled={!addId} onClick={addItem}>{t('common.add')}</Button>
            </div>
          ) : null}
          {editableItems ? <p className="mt-2 text-xs text-muted">{t('orders.priceKeptHint')}</p> : null}
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ Page */
export default function OrderDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const f = useFormat()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { notify } = useApiError()
  const queryClient = useQueryClient()

  const { data: order, isLoading, error } = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.get(id) })

  const [modal, setModal] = useState(null) // 'pay' | 'receipt' | 'whatsapp' | 'edit' | 'cancel' | 'collect' | 'request' | 'reverse'
  const [receiptId, setReceiptId] = useState(null)
  const [reversePayment, setReversePayment] = useState(null)
  const close = () => setModal(null)

  const statusMutation = useOrderMutation(id, (data) => ordersApi.setStatus(id, data), 'orders.statusUpdated')
  const cancelMutation = useOrderMutation(id, (reason) => ordersApi.cancel(id, reason), 'orders.cancelled')
  const requestMutation = useOrderMutation(id, (note) => ordersApi.requestCollection(id, note), 'orders.approvalRequested')
  const decideMutation = useOrderMutation(id, ({ decision, note }) => ordersApi.decideCollection(id, decision, note), 'orders.approvalDecided')
  const reverseMutation = useMutation({
    mutationFn: ({ paymentId, reason }) => paymentsApi.reverse(paymentId, reason),
    onSuccess: () => {
      toast.success(t('payments.reversed'))
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setReversePayment(null)
    },
    onError: notify,
  })

  if (isLoading) return <PageLoader />
  if (error || !order) return <EmptyState title={t('orders.notFound')} action={<Button onClick={() => navigate('/orders')}>{t('common.back')}</Button>} />

  const balance = Number(order.balance)
  const closed = ['COLLECTED', 'CANCELLED'].includes(order.status)
  const next = NEXT_STATUS[order.status]
  const needsApproval = balance > 0 && order.collection_approval !== 'APPROVED'

  const advance = () => {
    if (next === 'COLLECTED' && needsApproval) {
      setModal(isAdmin ? 'collect' : 'request')
      return
    }
    statusMutation.mutate({ status: next })
  }

  const openReceipt = (rid) => {
    setReceiptId(rid)
    setModal('receipt')
  }
  const latestOrderReceipt = order.receipts.find((r) => r.receipt_type === 'ORDER')

  return (
    <div>
      <PageHeader
        back={() => navigate(-1)}
        title={order.reference}
        subtitle={`${t('orders.createdBy')}: ${order.created_by_name} · ${f.dateTime(order.created_at)}`}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
            {order.is_overdue ? <OverdueBadge /> : null}
          </div>
        }
      />

      {/* Approval banner */}
      {order.collection_approval === 'PENDING' && !closed ? (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/12 p-4 sm:flex-row sm:items-center">
          <ShieldAlert className="size-5 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{t('orders.approvalPending')}</p>
            <p className="text-muted">
              {order.collection_requested_by_name} · {f.dateTime(order.collection_requested_at)}
              {order.collection_request_note ? ` — “${order.collection_request_note}”` : ''}
            </p>
          </div>
          {isAdmin ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" loading={decideMutation.isPending} onClick={() => decideMutation.mutate({ decision: 'reject', note: '' })}>{t('orders.reject')}</Button>
              <Button size="sm" variant="success" icon={ShieldCheck} loading={decideMutation.isPending} onClick={() => decideMutation.mutate({ decision: 'approve', note: '' })}>{t('orders.approve')}</Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {order.collection_approval === 'APPROVED' && !closed && balance > 0 ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
          <ShieldCheck className="size-5 text-success" />
          <span>{t('orders.approvalApproved', { name: order.collection_decided_by_name || '' })}</span>
        </div>
      ) : null}
      {order.collection_approval === 'REJECTED' && !closed ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm">
          <Ban className="size-5 text-danger" />
          <span>{t('orders.approvalRejected')}{order.collection_decision_note ? ` — ${order.collection_decision_note}` : ''}</span>
        </div>
      ) : null}
      {order.status === 'CANCELLED' ? (
        <div className="mb-4 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm">
          <p className="font-semibold text-danger">{t('orders.cancelledBy', { name: order.cancelled_by_name, date: f.dateTime(order.cancelled_at) })}</p>
          <p className="mt-1">{order.cancellation_reason}</p>
        </div>
      ) : null}

      {/* Actions */}
      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {next ? (
            <Button icon={CheckCircle2} loading={statusMutation.isPending} onClick={advance}>
              {t(`orders.markAs.${next}`)}
            </Button>
          ) : null}
          {balance > 0 && order.status !== 'CANCELLED' ? (
            <Button variant="accent" icon={Wallet} onClick={() => setModal('pay')}>{t('payments.record')}</Button>
          ) : null}
          <Button variant="secondary" icon={FileText} onClick={() => latestOrderReceipt && openReceipt(latestOrderReceipt.id)} disabled={!latestOrderReceipt}>{t('receipt.title')}</Button>
          <Button variant="success" icon={MessageCircle} onClick={() => setModal('whatsapp')}>WhatsApp</Button>
          {order.status !== 'CANCELLED' ? <Button variant="secondary" icon={Pencil} onClick={() => setModal('edit')}>{t('common.edit')}</Button> : null}
          {order.status === 'PROCESSING' || order.status === 'READY' ? (
            <Button variant="ghost" icon={Undo2} loading={statusMutation.isPending} onClick={() => statusMutation.mutate({ status: order.status === 'READY' ? 'PROCESSING' : 'RECEIVED' })}>{t('orders.stepBack')}</Button>
          ) : null}
          {isAdmin && order.status === 'COLLECTED' ? (
            <Button variant="ghost" icon={Undo2} onClick={() => statusMutation.mutate({ status: 'READY' })}>{t('orders.undoCollected')}</Button>
          ) : null}
          {isAdmin && !closed ? (
            <Button variant="dangerGhost" icon={Ban} onClick={() => setModal('cancel')}>{t('orders.cancelOrder')}</Button>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader title={t('orders.items')} subtitle={t('orders.itemsCount', { count: order.total_quantity })} />
            <div className="divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.item_name_snapshot}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {item.category_name_snapshot} <ServiceTypeBadge type={item.service_type} />
                    </p>
                    {item.condition_notes ? <p className="mt-1.5 rounded-xl bg-warning/10 px-2.5 py-1.5 text-xs">{item.condition_notes}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-xs text-muted">{item.quantity} × {f.money(item.unit_price)}</p>
                    <p className="tabular font-bold">{f.money(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
            {order.notes ? <p className="mt-3 rounded-2xl bg-surface-strong p-3 text-sm"><span className="font-semibold">{t('common.notes')}:</span> {order.notes}</p> : null}
          </Card>

          <Card>
            <CardHeader title={t('payments.history')} action={balance > 0 && order.status !== 'CANCELLED' ? <Button size="sm" variant="accent" icon={Plus} onClick={() => setModal('pay')}>{t('payments.add')}</Button> : null} />
            {order.payments.length ? (
              <div className="divide-y divide-line">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">{p.method_display ? t(`paymentMethod.${p.payment_method}`) : ''}{p.method_other ? ` (${p.method_other})` : ''}</p>
                      <p className="text-xs text-muted">{f.dateTime(p.received_at)} · {p.received_by_name}{p.transaction_reference ? ` · ${p.transaction_reference}` : ''}</p>
                      {p.status === 'REVERSED' ? (
                        <p className="mt-1 text-xs text-danger">{t('payments.reversedBy', { name: p.reversed_by_name, reason: p.reversal_reason })}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className={cn('tabular font-bold', p.status === 'REVERSED' && 'text-muted line-through')}>{f.money(p.amount)}</p>
                      {isAdmin && p.status === 'VALID' ? (
                        <button type="button" onClick={() => setReversePayment(p)} className="grid size-8 place-items-center rounded-full text-danger hover:bg-danger/10" title={t('payments.reverse')}><Undo2 className="size-4" /></button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">{t('payments.none')}</p>
            )}
          </Card>

          {isAdmin && order.activity?.length ? (
            <Card>
              <CardHeader title={t('orders.activity')} />
              <ol className="relative ml-2 border-l border-line">
                {order.activity.map((log) => (
                  <li key={log.id} className="mb-4 ml-4">
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-sky" />
                    <p className="text-sm font-medium">{t(`audit.actions.${log.action}`)}</p>
                    <p className="text-xs text-muted">{log.user_name} · {f.dateTime(log.created_at)}</p>
                    <p className="mt-0.5 text-xs">{log.description}</p>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title={t('orders.paymentSummary')} />
            <InfoRow label={t('orders.total')}><span className="tabular text-base font-bold">{f.money(order.total_amount)}</span></InfoRow>
            <InfoRow label={t('orders.paid')}><span className="tabular">{f.money(order.amount_paid)}</span></InfoRow>
            <InfoRow label={t('orders.balance')}><span className={cn('tabular text-base font-bold', balance > 0 ? 'text-danger' : 'text-success')}>{f.money(order.balance)}</span></InfoRow>
          </Card>

          <Card>
            <CardHeader title={t('orders.customer')} action={<Link to={`/customers/${order.customer.id}`} className="text-sm font-semibold text-sky">{t('common.open')}</Link>} />
            <p className="font-semibold">{order.customer.full_name}</p>
            <a href={`tel:${order.customer.phone_number}`} className="mt-1 flex items-center gap-2 text-sm text-muted"><Phone className="size-4" /> {order.customer.phone_number}</a>
          </Card>

          <Card>
            <CardHeader title={t('orders.dates')} />
            <InfoRow label={t('orders.dropOff')}>{f.date(order.drop_off_date)}</InfoRow>
            <InfoRow label={t('orders.pickup')}><span className={order.is_overdue ? 'text-danger' : ''}>{f.date(order.pickup_date)}</span></InfoRow>
            {order.collected_at ? <InfoRow label={t('orders.collectedAt')}>{f.dateTime(order.collected_at)}<br /><span className="text-xs text-muted">{order.collected_by_name}</span></InfoRow> : null}
          </Card>

          <Card>
            <CardHeader title={t('receipt.history')} />
            <div className="flex flex-col gap-1.5">
              {order.receipts.map((r) => (
                <button key={r.id} type="button" onClick={() => openReceipt(r.id)} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-surface-strong">
                  <span>
                    <span className="block font-semibold">{r.receipt_number}</span>
                    <span className="block text-xs text-muted">{t(`receipt.types.${r.receipt_type}`)} · {f.dateTime(r.generated_at)}</span>
                  </span>
                  <span className="tabular text-xs font-semibold">{f.money(r.amount)}</span>
                </button>
              ))}
            </div>
          </Card>

          {order.whatsapp_logs?.length ? (
            <Card>
              <CardHeader title={t('whatsapp.history')} subtitle={t('whatsapp.historyNote')} />
              {order.whatsapp_logs.map((w) => (
                <div key={w.id} className="py-1.5 text-sm">
                  <p className="font-medium">{t(`whatsapp.templates.${w.template_key}`)}</p>
                  <p className="text-xs text-muted">{w.initiated_by_name} · {f.dateTime(w.initiated_at)}</p>
                </div>
              ))}
            </Card>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <RecordPaymentModal order={order} open={modal === 'pay'} onClose={close} onRecorded={(data) => data?.receipt && openReceipt(data.receipt.id)} />
      <ReceiptModal receiptId={receiptId} open={modal === 'receipt'} onClose={close} onWhatsApp={() => setModal('whatsapp')} />
      <WhatsAppModal order={order} open={modal === 'whatsapp'} onClose={close} />
      <EditOrderModal order={order} open={modal === 'edit'} onClose={close} />
      <ConfirmDialog
        open={modal === 'cancel'}
        onClose={close}
        title={t('orders.cancelOrder')}
        message={t('orders.cancelWarning')}
        reasonLabel={t('common.reason')}
        confirmLabel={t('orders.cancelOrder')}
        loading={cancelMutation.isPending}
        onConfirm={(reason) => cancelMutation.mutate(reason, { onSuccess: close })}
      />
      <ConfirmDialog
        open={modal === 'request'}
        onClose={close}
        tone="primary"
        title={t('orders.needsApproval')}
        message={t('orders.needsApprovalText', { balance: f.money(order.balance) })}
        reasonLabel={t('orders.requestNote')}
        reasonRequired={false}
        confirmLabel={t('orders.requestApproval')}
        loading={requestMutation.isPending}
        onConfirm={(note) => requestMutation.mutate(note, { onSuccess: close })}
      />
      <ConfirmDialog
        open={modal === 'collect'}
        onClose={close}
        tone="primary"
        title={t('orders.collectWithBalance')}
        message={t('orders.collectWithBalanceText', { balance: f.money(order.balance) })}
        reasonLabel={t('orders.approvalNote')}
        reasonRequired={false}
        confirmLabel={t('orders.approveAndCollect')}
        loading={statusMutation.isPending}
        onConfirm={(note) => statusMutation.mutate({ status: 'COLLECTED', approve_balance: true, note }, { onSuccess: close })}
      />
      <ConfirmDialog
        open={Boolean(reversePayment)}
        onClose={() => setReversePayment(null)}
        title={t('payments.reverse')}
        message={reversePayment ? t('payments.reverseWarning', { amount: f.money(reversePayment.amount) }) : ''}
        reasonLabel={t('common.reason')}
        confirmLabel={t('payments.reverse')}
        loading={reverseMutation.isPending}
        onConfirm={(reason) => reverseMutation.mutate({ paymentId: reversePayment.id, reason })}
      />
    </div>
  )
}
