import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Info } from 'lucide-react'
import { toast } from 'sonner'
import { ordersApi } from '../../api'
import { useI18n } from '../../context/I18nContext'
import { useApiError } from '../../hooks/useApiError'
import { Button, Modal, Pills, Textarea, WashingLoader } from '../ui'

export const TEMPLATE_KEYS = ['ORDER_RECEIVED', 'ORDER_READY', 'PICKUP_REMINDER', 'PAYMENT_REMINDER']

/** Suggest the most relevant message for the order's situation. */
export function suggestTemplate(order) {
  if (!order) return 'ORDER_RECEIVED'
  if (order.status === 'READY') return 'ORDER_READY'
  if (order.status === 'COLLECTED' && Number(order.balance) > 0) return 'PAYMENT_REMINDER'
  if (order.is_overdue) return Number(order.balance) > 0 ? 'PAYMENT_REMINDER' : 'PICKUP_REMINDER'
  return 'ORDER_RECEIVED'
}

export default function WhatsAppModal({ order, open, onClose, initialTemplate }) {
  const { t } = useI18n()
  const { notify } = useApiError()
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState('ORDER_RECEIVED')
  const [language, setLanguage] = useState('en')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open && order) {
      setTemplate(initialTemplate || suggestTemplate(order))
      setLanguage(order.customer?.preferred_language || 'en')
    }
  }, [open, order, initialTemplate])

  const preview = useQuery({
    queryKey: ['whatsapp', order?.id, template, language],
    queryFn: () => ordersApi.whatsappPreview(order.id, template, language),
    enabled: open && Boolean(order),
  })

  useEffect(() => {
    if (preview.data) setMessage(preview.data.message)
  }, [preview.data])

  const send = async () => {
    // Open the window synchronously (popup blockers), then point it at wa.me.
    const win = window.open('', '_blank')
    setSending(true)
    try {
      const data = await ordersApi.whatsappSend(order.id, { template, language, message })
      if (win) win.location.href = data.url
      else window.location.href = data.url
      toast.success(t('whatsapp.opened'))
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      onClose()
    } catch (error) {
      win?.close()
      notify(error)
    } finally {
      setSending(false)
    }
  }

  if (!order) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('whatsapp.title')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="success" icon={ExternalLink} loading={sending} disabled={!message.trim()} onClick={send}>
            {t('whatsapp.open')}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">
        {t('whatsapp.to')} <span className="font-semibold text-ink">{order.customer.full_name}</span> · {order.customer.phone_number}
      </p>
      <div className="flex flex-col gap-3">
        <Pills size="sm" value={template} onChange={setTemplate} options={TEMPLATE_KEYS.map((key) => ({ value: key, label: t(`whatsapp.templates.${key}`) }))} />
        <Pills size="sm" value={language} onChange={setLanguage} options={[{ value: 'en', label: 'English' }, { value: 'rw', label: 'Kinyarwanda' }]} />
        {preview.isLoading ? (
          <WashingLoader className="py-6" size={70} />
        ) : (
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} />
        )}
        <p className="flex items-start gap-2 rounded-2xl bg-sky/10 p-3 text-xs text-sky">
          <Info className="mt-0.5 size-4 shrink-0" /> {t('whatsapp.manualNote')}
        </p>
      </div>
    </Modal>
  )
}
