import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Receipt, Undo2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { ordersApi, paymentsApi, receiptsApi, usersApi } from '../api'
import ReceiptModal from '../components/orders/ReceiptModal'
import RecordPaymentModal, { PAYMENT_METHODS } from '../components/orders/RecordPaymentModal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, PageLoader, Pagination, SearchInput, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'
import { useDebounce } from '../hooks/useDebounce'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'

/** Step 1 of "record payment" from this page: find the order. */
function FindOrderModal({ open, onClose, onPick }) {
  const { t } = useI18n()
  const f = useFormat()
  const [term, setTerm] = useState('')
  const debounced = useDebounce(term, 300)
  useEffect(() => {
    if (open) setTerm('')
  }, [open])
  const results = useQuery({
    queryKey: ['orders', 'with-balance', debounced],
    queryFn: () => ordersApi.list({ search: debounced, has_balance: true, page_size: 8, ordering: '-created_at' }),
    enabled: open,
  })
  return (
    <Modal open={open} onClose={onClose} title={t('payments.findOrder')} size="md">
      <SearchInput value={term} onChange={setTerm} placeholder={t('orders.searchPlaceholder')} autoFocus />
      <div className="mt-3 flex flex-col gap-1.5">
        {results.data?.results?.map((o) => (
          <button key={o.id} type="button" onClick={() => onPick(o)} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-strong px-3.5 py-2.5 text-left hover:border-sky">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{o.customer.full_name}</span>
              <span className="block truncate text-xs text-muted">{o.reference} · {f.date(o.pickup_date)}</span>
            </span>
            <span className="tabular shrink-0 text-sm font-bold text-danger">{f.money(o.balance)}</span>
          </button>
        ))}
        {results.data && !results.data.results.length ? <p className="py-6 text-center text-sm text-muted">{t('payments.noOrdersWithBalance')}</p> : null}
      </div>
    </Modal>
  )
}

export default function PaymentsPage() {
  const { t } = useI18n()
  const f = useFormat()
  const { isAdmin } = useAuth()
  const { notify } = useApiError()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ payment_method: '', status: '', date_from: '', date_to: '', received_by: '' })
  const [page, setPage] = useState(1)
  const [finding, setFinding] = useState(false)
  const [payOrder, setPayOrder] = useState(null)
  const [receiptId, setReceiptId] = useState(null)
  const [reverse, setReverse] = useState(null)
  const debounced = useDebounce(search)

  useEffect(() => setPage(1), [debounced, filters])

  const params = { ...filters, search: debounced.trim(), page }
  const { data, isLoading } = useQuery({ queryKey: ['payments', params], queryFn: () => paymentsApi.list(params), placeholderData: keepPreviousData })
  const staff = useQuery({ queryKey: ['staff'], queryFn: usersApi.staff, enabled: isAdmin })

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }) => paymentsApi.reverse(id, reason),
    onSuccess: () => {
      toast.success(t('payments.reversed'))
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setReverse(null)
    },
    onError: notify,
  })

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value })
  const pageTotal = (data?.results || []).filter((p) => p.status === 'VALID').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div>
      <PageHeader title={t('nav.payments')} subtitle={data ? t('payments.count', { count: data.count }) : null} actions={<Button icon={Plus} onClick={() => setFinding(true)}>{t('payments.record')}</Button>} />
      <Card className="p-4 sm:p-5">
        <SearchInput value={search} onChange={setSearch} placeholder={t('payments.searchPlaceholder')} />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Select label={t('payments.method')} value={filters.payment_method} onChange={setFilter('payment_method')}>
            <option value="">{t('common.all')}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>)}
          </Select>
          <Select label={t('orders.status')} value={filters.status} onChange={setFilter('status')}>
            <option value="">{t('common.all')}</option>
            <option value="VALID">{t('payments.valid')}</option>
            <option value="REVERSED">{t('payments.reversedLabel')}</option>
          </Select>
          <Input type="date" label={t('common.from')} value={filters.date_from} onChange={setFilter('date_from')} />
          <Input type="date" label={t('common.to')} value={filters.date_to} onChange={setFilter('date_to')} />
          {isAdmin ? (
            <Select label={t('payments.receivedBy')} value={filters.received_by} onChange={setFilter('received_by')}>
              <option value="">{t('common.all')}</option>
              {(staff.data || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </Select>
          ) : null}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <PageLoader />
          ) : data?.results?.length ? (
            <>
              <div className="divide-y divide-line">
                {data.results.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/orders/${p.order}`} className="font-semibold hover:underline">{p.order_reference}</Link>
                        <span className="text-sm text-muted">{p.customer_name}</span>
                        {p.status === 'REVERSED' ? <Badge tone="danger">{t('payments.reversedLabel')}</Badge> : null}
                      </div>
                      <p className="text-xs text-muted">
                        {t(`paymentMethod.${p.payment_method}`)}{p.method_other ? ` (${p.method_other})` : ''}
                        {p.transaction_reference ? ` · ${p.transaction_reference}` : ''} · {f.dateTime(p.received_at)} · {p.received_by_name}
                      </p>
                      {p.status === 'REVERSED' ? <p className="text-xs text-danger">{p.reversal_reason}</p> : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <p className={cn('tabular text-base font-bold', p.status === 'REVERSED' && 'text-muted line-through')}>{f.money(p.amount)}</p>
                      <div className="flex gap-1">
                        <ReceiptButton payment={p} onOpen={setReceiptId} />
                        {isAdmin && p.status === 'VALID' ? (
                          <button type="button" onClick={() => setReverse(p)} className="grid size-9 place-items-center rounded-full text-danger hover:bg-danger/10" title={t('payments.reverse')}>
                            <Undo2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end text-sm text-muted">
                {t('payments.pageTotal')}: <span className="tabular ml-1 font-semibold text-ink">{f.money(pageTotal)}</span>
              </div>
              <Pagination page={page} count={data.count} onChange={setPage} />
            </>
          ) : (
            <EmptyState icon={Wallet} title={t('payments.empty')} />
          )}
        </div>
      </Card>

      <FindOrderModal open={finding} onClose={() => setFinding(false)} onPick={(o) => { setFinding(false); setPayOrder(o) }} />
      <RecordPaymentModal order={payOrder} open={Boolean(payOrder)} onClose={() => setPayOrder(null)} onRecorded={(d) => d?.receipt && setReceiptId(d.receipt.id)} />
      <ReceiptModal receiptId={receiptId} open={Boolean(receiptId)} onClose={() => setReceiptId(null)} />
      <ConfirmDialog
        open={Boolean(reverse)}
        onClose={() => setReverse(null)}
        title={t('payments.reverse')}
        message={reverse ? t('payments.reverseWarning', { amount: f.money(reverse.amount) }) : ''}
        reasonLabel={t('common.reason')}
        confirmLabel={t('payments.reverse')}
        loading={reverseMutation.isPending}
        onConfirm={(reason) => reverseMutation.mutate({ id: reverse.id, reason })}
      />
    </div>
  )
}

/** Opens the payment receipt for this payment (looked up lazily). */
function ReceiptButton({ payment, onOpen }) {
  const { t } = useI18n()
  const { notify } = useApiError()
  const open = async () => {
    try {
      // Payments taken while registering the order are on the order receipt.
      const receipt = (await receiptsApi.forPayment(payment.id)) || (await ordersApi.receipt(payment.order))
      onOpen(receipt.id)
    } catch (e) {
      notify(e)
    }
  }
  return (
    <button type="button" onClick={open} className="grid size-9 place-items-center rounded-full hover:bg-surface-strong" title={t('receipt.title')}>
      <Receipt className="size-4" />
    </button>
  )
}
