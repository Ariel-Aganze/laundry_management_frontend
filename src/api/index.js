import { api } from './client'

const get = (url, params) => api.get(url, { params }).then((r) => r.data)
const post = (url, data, config) => api.post(url, data, config).then((r) => r.data)
const patch = (url, data, config) => api.patch(url, data, config).then((r) => r.data)
const del = (url) => api.delete(url).then((r) => r.data)

/** Drop empty filter values so query strings stay clean. */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false),
  )
}

export const authApi = {
  login: (login, password) => post('/auth/login/', { login, password }, { skipAuth: true }),
  logout: (refresh) => post('/auth/logout/', { refresh }),
  me: () => get('/auth/me/'),
  updateMe: (data) => patch('/auth/me/', data),
  changePassword: (data) => post('/auth/change-password/', data),
}

export const settingsApi = {
  get: () => get('/settings/'),
  public: () => api.get('/settings/public/', { skipAuth: true }).then((r) => r.data),
  update: (data) => patch('/settings/', data),
  templates: () => get('/settings/whatsapp-templates/'),
  updateTemplate: (id, body) => patch(`/settings/whatsapp-templates/${id}/`, { body }),
}

export const customersApi = {
  list: (params) => get('/customers/', cleanParams(params)),
  get: (id) => get(`/customers/${id}/`),
  create: (data) => post('/customers/', data),
  update: (id, data) => patch(`/customers/${id}/`, data),
  orders: (id, params) => get(`/customers/${id}/orders/`, cleanParams(params)),
  payments: (id, params) => get(`/customers/${id}/payments/`, cleanParams(params)),
}

export const catalogApi = {
  tree: () => get('/catalog/'),
  categories: (params) => get('/categories/', cleanParams(params)),
  createCategory: (data) => post('/categories/', data),
  updateCategory: (id, data) => patch(`/categories/${id}/`, data),
  services: (params) => get('/services/', cleanParams({ page_size: 200, ...params })),
  createService: (data) => post('/services/', data),
  updateService: (id, data) => patch(`/services/${id}/`, data),
}

export const ordersApi = {
  list: (params) => get('/orders/', cleanParams(params)),
  search: (q) => get('/orders/search/', { q }),
  get: (id) => get(`/orders/${id}/`),
  create: (data) => post('/orders/', data),
  update: (id, data) => patch(`/orders/${id}/`, data),
  setStatus: (id, data) => post(`/orders/${id}/status/`, data),
  cancel: (id, reason) => post(`/orders/${id}/cancel/`, { reason }),
  requestCollection: (id, note) => post(`/orders/${id}/request-collection/`, { note }),
  decideCollection: (id, decision, note) => post(`/orders/${id}/decide-collection/`, { decision, note }),
  receipt: (id) => get(`/orders/${id}/receipt/`),
  whatsappPreview: (id, template, language) => get(`/orders/${id}/whatsapp/`, cleanParams({ template, language })),
  whatsappSend: (id, data) => post(`/orders/${id}/whatsapp/`, data),
}

export const paymentsApi = {
  list: (params) => get('/payments/', cleanParams(params)),
  create: (data) => post('/payments/', data),
  reverse: (id, reason) => post(`/payments/${id}/reverse/`, { reason }),
}

export const receiptsApi = {
  get: (id) => get(`/receipts/${id}/`),
  forPayment: (paymentId) => get('/receipts/', { payment: paymentId, page_size: 1 }).then((d) => d.results?.[0] || null),
  pdf: (id, params) => api.get(`/receipts/${id}/pdf/`, { params, responseType: 'blob' }).then((r) => r.data),
}

export const usersApi = {
  staff: () => get('/users/'),
  cashiers: (params) => get('/users/cashiers/', cleanParams(params)),
  createCashier: (data) => post('/users/cashiers/', data),
  updateCashier: (id, data) => patch(`/users/cashiers/${id}/`, data),
  activate: (id) => post(`/users/cashiers/${id}/activate/`),
  deactivate: (id) => post(`/users/cashiers/${id}/deactivate/`),
  resetPassword: (id, new_password) => post(`/users/cashiers/${id}/reset-password/`, { new_password }),
}

export const reportsApi = {
  summary: (params) => get('/dashboard/summary/', cleanParams(params)),
  pickups: (params) => get('/dashboard/pickups/', cleanParams(params)),
  overdue: (params) => get('/dashboard/overdue/', cleanParams(params)),
  revenue: (params) => get('/analytics/revenue/', cleanParams(params)),
  services: (params) => get('/analytics/services/', cleanParams(params)),
  cashiers: (params) => get('/analytics/cashiers/', cleanParams(params)),
  customers: (params) => get('/analytics/customers/', cleanParams(params)),
  payments: (params) => get('/analytics/payments/', cleanParams(params)),
}

export const auditApi = {
  list: (params) => get('/audit-logs/', cleanParams(params)),
}

export { del }
