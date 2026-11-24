import { useEffect, useState } from 'react'
import { useI18n } from '../../context/I18nContext'
import { Button, Modal, Textarea } from './index'

/**
 * Confirmation for destructive / important actions.
 * With `reasonLabel` the user must type a reason (cancel order, reverse payment...).
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  reasonLabel,
  reasonRequired = true,
  loading,
}) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const blocked = reasonLabel && reasonRequired && !reason.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone} loading={loading} disabled={blocked} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {reasonLabel ? (
        <Textarea
          className="mt-4"
          label={reasonLabel}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
          rows={3}
        />
      ) : null}
    </Modal>
  )
}
