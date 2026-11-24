/**
 * Turn an API error into a translated, human-friendly message.
 * The backend returns {detail, code, errors?}; we translate by `code` when we can.
 */
export function apiErrorMessage(error, t, tMaybe) {
  if (!error) return ''
  if (!error.response) {
    return error.code === 'ECONNABORTED' ? t('errors.timeout') : t('errors.network')
  }
  const { status, data } = error.response
  if (status === 403) return tMaybe(`errors.codes.${data?.code}`, t('errors.forbidden'))
  if (status >= 500) return t('errors.server')
  const code = data?.code
  if (code === 'validation_error' && data?.errors) {
    const first = firstFieldError(data.errors)
    if (first) return tMaybe(`errors.codes.${first.code}`, first.message)
  }
  return tMaybe(`errors.codes.${code}`, data?.detail || t('errors.generic'), data)
}

function firstFieldError(errors) {
  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry.message === 'string') return entry
        const nested = entry && typeof entry === 'object' ? firstFieldError(entry) : null
        if (nested) return nested
      }
    } else if (value && typeof value === 'object') {
      const nested = firstFieldError(value)
      if (nested) return nested
    }
  }
  return null
}

/** {field: "translated message"} for top-level form fields. */
export function fieldErrors(error, tMaybe) {
  const errors = error?.response?.data?.errors
  if (!errors) return {}
  const result = {}
  for (const [field, value] of Object.entries(errors)) {
    const first = Array.isArray(value) ? value.find((v) => v && v.message) : null
    if (first) result[field] = tMaybe(`errors.codes.${first.code}`, first.message)
  }
  return result
}
