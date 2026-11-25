import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, MessageCircle, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { receiptsApi } from '../../api'
import { mediaUrl } from '../../api/client'
import { useI18n } from '../../context/I18nContext'
import { useApiError } from '../../hooks/useApiError'
import { useSettings } from '../../hooks/useSettings'
import en from '../../i18n/en'
import rw from '../../i18n/rw'
import { cn } from '../../lib/cn'
import { Button, Modal, Pills, WashingLoader } from '../ui'

const DICTS = { en, rw }
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  rw: ['Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena', 'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza'],
}

function rt(lang, path) {
  const read = (dict) => path.split('.').reduce((node, key) => node?.[key], dict)
  return read(DICTS[lang]) ?? read(DICTS.en) ?? path
}

function fmtDate(value, lang, withTime) {
  if (!value) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  const base = `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`
  if (!withTime) return base
  return `${base} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtMoney(value, business) {
  const decimals = business?.currency_decimals ?? 0
  const n = Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${business?.currency || ''} ${n}`
}

const WIDTHS = { '58mm': 'w-[58mm] text-[10px] p-[3mm]', '80mm': 'w-[80mm] text-[11.5px] p-[4mm]', A4: 'w-full max-w-[180mm] text-[13px] p-[10mm]' }

/** Browser/thermal printable receipt. Rendered from the frozen receipt snapshot. */
export function ReceiptPaper({ data, lang, paper, logoUrl }) {
  const b = data.business || {}
  const money = (v) => fmtMoney(v, b)
  const L = (key) => rt(lang, `receipt.${key}`)
  const Row = ({ left, right, bold, big }) => (
    <div className={cn('flex justify-between gap-3', bold && 'font-bold', big && 'text-[1.12em]')}>
      <span>{left}</span>
      <span className="text-right">{right}</span>
    </div>
  )
  const Rule = () => <div className="my-[0.6em] border-t border-dashed border-black/60" />
  const isPayment = data.receipt_type === 'PAYMENT'
  const payment = data.payment

  return (
    <div className={cn('print-area mx-auto bg-white font-mono leading-[1.45] text-black shadow-soft', WIDTHS[paper] || WIDTHS['80mm'])}>
      {logoUrl ? <img src={logoUrl} alt="" className="mx-auto mb-1 max-h-14 max-w-[60%] object-contain" /> : null}
      <p className="text-center text-[1.3em] font-bold">{b.name}</p>
      {b.address ? <p className="text-center">{b.address}</p> : null}
      {b.phone ? <p className="text-center">Tel: {b.phone}</p> : null}
      {b.email ? <p className="text-center">{b.email}</p> : null}
      <Rule />
      <p className="text-center font-bold">{L(isPayment ? 'paymentReceipt' : 'orderReceipt')}</p>
      <Row left={L('receiptNo')} right={data.receipt_number} />
      <Row left={L('orderRef')} right={data.order.reference} bold />
      <Row left={L('date')} right={fmtDate(data.generated_at, lang, true)} />
      <Row left={L('servedBy')} right={data.generated_by} />
      <Rule />
      <Row left={L('customer')} right={data.customer.name} />
      <Row left={L('phone')} right={data.customer.phone} />
      <Row left={L('dropOff')} right={fmtDate(data.order.drop_off_date, lang)} />
      <Row left={L('pickup')} right={fmtDate(data.order.pickup_date, lang)} bold />
      <Rule />
      {data.items.map((item, i) => (
        <div key={i} className="mb-[0.4em]">
          <p className="font-bold">
            {item.item} - {item.category}
          </p>
          <Row
            left={`${item.quantity} x ${money(item.unit_price)} (${rt(lang, `serviceType.${item.service_type}`)})`}
            right={item.is_free ? L('free') : money(item.subtotal)}
            bold={item.is_free}
          />
          {item.condition_notes ? <p className="text-[0.9em]">{L('notes')}: {item.condition_notes}</p> : null}
        </div>
      ))}
      <Rule />
      <Row left={L('totalItems')} right={data.total_quantity} />
      <Row left={L('total')} right={money(data.total_amount)} bold big />
      <Row left={L('paid')} right={money(data.amount_paid)} />
      <Row left={L('balance')} right={money(data.balance)} bold />
      <Row left={L('status')} right={rt(lang, `paymentStatus.${data.payment_status}`)} />
      {isPayment && payment ? (
        <>
          <Rule />
          <p className="font-bold">{L('paymentDetails')}</p>
          <Row left={L('amount')} right={money(payment.amount)} bold />
          <Row left={L('method')} right={payment.method_other || rt(lang, `paymentMethod.${payment.payment_method}`)} />
          {payment.transaction_reference ? <Row left={L('reference')} right={payment.transaction_reference} /> : null}
          <Row left={L('received')} right={fmtDate(payment.received_at, lang, true)} />
        </>
      ) : null}
      <Rule />
      {b.footer ? <p className="text-center text-[0.92em]">{b.footer}</p> : null}
      <p className="mt-1 text-center font-bold">{L('thankYou')}</p>
    </div>
  )
}

function printReceipt(paper) {
  const source = document.querySelector('[role="dialog"] .print-area')
  if (!source) return
  let root = document.getElementById('print-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'print-root'
    document.body.appendChild(root)
  }
  root.innerHTML = source.outerHTML
  const style = document.createElement('style')
  style.id = 'receipt-page-size'
  style.textContent =
    paper === 'A4' ? '@page { size: A4; margin: 12mm; }' : `@page { size: ${paper} auto; margin: 0; }`
  document.head.appendChild(style)
  document.body.classList.add('printing-receipt')
  const cleanup = () => {
    document.body.classList.remove('printing-receipt')
    style.remove()
    root.innerHTML = ''
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

export default function ReceiptModal({ receiptId, open, onClose, onWhatsApp }) {
  const { t, lang: uiLang } = useI18n()
  const settings = useSettings()
  const { notify } = useApiError()
  const [lang, setLang] = useState(uiLang)
  const [paper, setPaper] = useState(settings.receipt_paper || '80mm')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (open) {
      setLang(uiLang)
      setPaper(settings.receipt_paper || '80mm')
    }
  }, [open, uiLang, settings.receipt_paper])

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => receiptsApi.get(receiptId),
    enabled: open && Boolean(receiptId),
    staleTime: Infinity, // receipts never change
  })

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await receiptsApi.pdf(receiptId, { paper, lang })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${receipt.receipt_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      toast.success(t('receipt.downloaded'))
    } catch (error) {
      notify(error)
    } finally {
      setDownloading(false)
    }
  }

  const logo = settings.receipt_show_logo ? mediaUrl(settings.logo_url) : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={receipt ? receipt.receipt_number : t('receipt.title')}
      size="md"
      footer={
        receipt ? (
          <>
            {onWhatsApp ? (
              <Button variant="success" icon={MessageCircle} onClick={onWhatsApp}>
                WhatsApp
              </Button>
            ) : null}
            <Button variant="secondary" icon={Download} loading={downloading} onClick={downloadPdf}>
              PDF
            </Button>
            <Button icon={Printer} onClick={() => printReceipt(paper)}>
              {t('receipt.print')}
            </Button>
          </>
        ) : null
      }
    >
      {isLoading || !receipt ? (
        <WashingLoader className="py-10" size={90} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Pills size="sm" value={paper} onChange={setPaper} options={['58mm', '80mm', 'A4'].map((p) => ({ value: p, label: p }))} />
            <Pills size="sm" value={lang} onChange={setLang} options={[{ value: 'en', label: 'EN' }, { value: 'rw', label: 'RW' }]} />
          </div>
          <div className="scroll-thin overflow-x-auto rounded-2xl bg-line/60 p-3 sm:p-5">
            <ReceiptPaper data={receipt.data} lang={lang} paper={paper} logoUrl={logo} />
          </div>
        </>
      )}
    </Modal>
  )
}
