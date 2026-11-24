import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { paymentsApi } from '../../api'
import { useI18n } from '../../context/I18nContext'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../lib/format'
import { Button, Input, Modal, Select, Textarea } from '../ui'

export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'OTHER']

export default function RecordPaymentModal({ order, open, onClose, onRecorded }) {
  const { t } = useI18n()
  const f = useFormat()
  const { notify, fields } = useApiError()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ amount: '', payment_method: 'CASH', method_other: '', transaction_reference: '', notes: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open && order) {
      setForm({ amount: String(Number(order.balance)), payment_method: 'CASH', method_other: '', transaction_reference: '', notes: '' })
      setErrors({})
    }
  }, [open, order])

  const mutation = useMutation({
    mutationFn: () => paymentsApi.create({ order: order.id, ...form }),
    onSuccess: (data) => {
      toast.success(t('payments.recorded'))
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onRecorded?.(data)
      onClose()
    },
    onError: (error) => {
      setErrors(fields(error))
      notify(error)
    },
  })

  if (!order) return null
  const balance = Number(order.balance)
  const amount = Number(form.amount || 0)
  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payments.record')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button loading={mutation.isPending} disabled={!(amount > 0) || amount > balance} onClick={() => mutation.mutate()}>
            {t('payments.save')}
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-strong border border-line p-3 text-sm">
        <div>
          <p className="text-muted">{t('orders.reference')}</p>
          <p className="font-semibold">{order.reference}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">{t('orders.balance')}</p>
          <p className="tabular font-bold text-danger">{f.money(balance)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <Input
          label={t('payments.amount')}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount || (amount > balance ? t('errors.codes.payment_exceeds_balance') : null)}
          required
        />
        <div className="flex flex-wrap gap-2">
          {[balance, balance / 2].filter((v) => v > 0).map((v, i) => (
            <button key={i} type="button" onClick={() => setForm((c) => ({ ...c, amount: String(Math.round(v * 100) / 100) }))} className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-semibold">
              {i === 0 ? t('payments.fullBalance') : t('payments.half')} · {f.money(v)}
            </button>
          ))}
        </div>
        <Select label={t('payments.method')} value={form.payment_method} onChange={set('payment_method')}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`paymentMethod.${m}`)}
            </option>
          ))}
        </Select>
        {form.payment_method === 'OTHER' ? (
          <Input label={t('payments.methodOther')} value={form.method_other} onChange={set('method_other')} error={errors.method_other} required />
        ) : null}
        {form.payment_method !== 'CASH' ? (
          <Input label={t('payments.transactionRef')} value={form.transaction_reference} onChange={set('transaction_reference')} />
        ) : null}
        <Textarea label={t('common.notes')} value={form.notes} onChange={set('notes')} rows={2} />
      </div>
    </Modal>
  )
}
