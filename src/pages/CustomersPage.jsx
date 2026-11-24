import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { customersApi } from '../api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, PageLoader, Pagination, SearchInput, Select, Textarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'
import { useDebounce } from '../hooks/useDebounce'
import { useSettings } from '../hooks/useSettings'
import { useFormat } from '../lib/format'

/** Create or edit a customer. Phone must include the country code. */
export function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const { t } = useI18n()
  const { isAdmin } = useAuth()
  const settings = useSettings()
  const { notify, fields } = useApiError()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [duplicate, setDuplicate] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(
        customer
          ? { full_name: customer.full_name, phone_number: customer.phone_number, preferred_language: customer.preferred_language, notes: customer.notes || '' }
          : { full_name: '', phone_number: '+250 ', preferred_language: settings.default_language || 'en', notes: '' },
      )
      setErrors({})
      setDuplicate(null)
    }
  }, [open, customer, settings.default_language])

  const mutation = useMutation({
    mutationFn: (allowDuplicate) => {
      const payload = { ...form }
      if (customer && payload.phone_number === customer.phone_number) delete payload.phone_number
      if (allowDuplicate) payload.allow_duplicate = true
      return customer ? customersApi.update(customer.id, payload) : customersApi.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(t(customer ? 'customers.updated' : 'customers.created'))
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', saved.id] })
      onSaved?.(saved)
      onClose()
    },
    onError: (error) => {
      const data = error.response?.data
      if (data?.code === 'duplicate_phone') {
        setDuplicate(data.existing_customer)
        return
      }
      setErrors(fields(error))
      notify(error)
    },
  })

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const phoneLocked = Boolean(customer) && !isAdmin

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? t('customers.edit') : t('customers.add')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate(false)}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Input label={t('customers.fullName')} value={form.full_name || ''} onChange={set('full_name')} error={errors.full_name} required autoFocus />
        <Input
          label={t('customers.phone')}
          type="tel"
          inputMode="tel"
          value={form.phone_number || ''}
          onChange={set('phone_number')}
          error={errors.phone_number}
          hint={phoneLocked ? t('customers.phoneAdminOnly') : t('customers.phoneHint')}
          disabled={phoneLocked}
          required
        />
        <Select label={t('customers.language')} value={form.preferred_language || 'en'} onChange={set('preferred_language')}>
          <option value="en">English</option>
          <option value="rw">Kinyarwanda</option>
        </Select>
        <Textarea label={t('common.notes')} value={form.notes || ''} onChange={set('notes')} rows={2} />

        {duplicate ? (
          <div className="rounded-2xl border border-warning/40 bg-warning/12 p-3 text-sm">
            <p className="font-semibold">{t('newOrder.duplicateTitle')}</p>
            <p className="mt-1">{duplicate.full_name} · {duplicate.phone_number}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { onClose(); navigate(`/customers/${duplicate.id}`) }}>{t('customers.openExisting')}</Button>
              {isAdmin ? (
                <Button size="sm" variant="secondary" loading={mutation.isPending} onClick={() => mutation.mutate(true)}>{t('customers.saveAnyway')}</Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export default function CustomersPage() {
  const { t } = useI18n()
  const f = useFormat()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const debounced = useDebounce(search)
  const navigate = useNavigate()

  useEffect(() => setPage(1), [debounced])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search: debounced, page }],
    queryFn: () => customersApi.list({ search: debounced.trim(), page }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader
        title={t('nav.customers')}
        subtitle={data ? t('customers.count', { count: data.count }) : null}
        actions={<Button icon={UserPlus} onClick={() => setShowForm(true)}>{t('customers.add')}</Button>}
      />
      <Card className="p-4 sm:p-5">
        <SearchInput value={search} onChange={setSearch} placeholder={t('customers.searchPlaceholder')} />
        <div className="mt-4">
          {isLoading ? (
            <PageLoader />
          ) : data?.results?.length ? (
            <>
              <div className="scroll-thin hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pb-3 font-medium">{t('common.name')}</th>
                      <th className="pb-3 font-medium">{t('customers.phone')}</th>
                      <th className="pb-3 text-right font-medium">{t('nav.orders')}</th>
                      <th className="pb-3 text-right font-medium">{t('customers.totalValue')}</th>
                      <th className="pb-3 text-right font-medium">{t('orders.balance')}</th>
                      <th className="pb-3 pl-4 font-medium">{t('customers.since')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((c) => (
                      <tr key={c.id} className="cursor-pointer border-t border-line hover:bg-surface-strong/60" onClick={() => navigate(`/customers/${c.id}`)}>
                        <td className="py-3 font-semibold">{c.full_name}</td>
                        <td className="py-3">{c.phone_number}</td>
                        <td className="tabular py-3 text-right">{c.orders_count}</td>
                        <td className="tabular py-3 text-right">{f.money(c.total_order_value)}</td>
                        <td className="tabular py-3 text-right">
                          <span className={Number(c.outstanding_balance) > 0 ? 'font-semibold text-danger' : 'text-muted'}>{f.money(c.outstanding_balance)}</span>
                        </td>
                        <td className="py-3 pl-4 text-muted">{f.date(c.created_at)}</td>
                        <td className="py-3 text-right"><ChevronRight className="ml-auto size-4 text-muted" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 md:hidden">
                {data.results.map((c) => (
                  <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-strong p-3.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.full_name}</p>
                      <p className="text-xs text-muted">{c.phone_number} · {t('customers.ordersCount', { count: c.orders_count })}</p>
                    </div>
                    {Number(c.outstanding_balance) > 0 ? <span className="tabular shrink-0 text-sm font-semibold text-danger">{f.money(c.outstanding_balance)}</span> : <ChevronRight className="size-4 shrink-0 text-muted" />}
                  </Link>
                ))}
              </div>
              <Pagination page={page} count={data.count} onChange={setPage} />
            </>
          ) : (
            <EmptyState icon={Users} title={t('customers.empty')} action={<Button icon={UserPlus} onClick={() => setShowForm(true)}>{t('customers.add')}</Button>} />
          )}
        </div>
      </Card>
      <CustomerFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={(c) => navigate(`/customers/${c.id}`)} />
    </div>
  )
}
