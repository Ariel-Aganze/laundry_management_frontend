import { useCallback } from 'react'
import { toast } from 'sonner'
import { useI18n } from '../context/I18nContext'
import { apiErrorMessage, fieldErrors } from '../lib/errors'

export function useApiError() {
  const { t, tMaybe } = useI18n()
  const message = useCallback((error) => apiErrorMessage(error, t, tMaybe), [t, tMaybe])
  const notify = useCallback((error) => toast.error(message(error)), [message])
  const fields = useCallback((error) => fieldErrors(error, tMaybe), [tMaybe])
  return { message, notify, fields }
}
