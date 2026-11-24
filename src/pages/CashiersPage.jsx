import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Power, UserCog, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { usersApi } from '../api'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, PageLoader, Pills, Select, Toggle } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'
import { useFormat } from '../lib/format'

function CashierModal({ open, onClose, cashier }) {
  const { t } = useI18n()
  const { notify, fields } = useApiError()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(
        cashier
          ? { first_name: cashier.first_name, last_name: cashier.last_name, username: cashier.username, email: cashier.email, preferred_language: cashier.preferred_language }
          : { first_name: '', last_name: '', username: '', email: '', password: '', preferred_language: 'en', is_active: true },
      )
      setErrors({})
    }
  }, [open, cashier])

  const mutation = useMutation({
    mutationFn: () => (cashier ? usersApi.updateCashier(cashier.id, form) : usersApi.createCashier(form)),
    onSuccess: () => {
      toast.success(t(cashier ? 'cashiers.updated' : 'cashiers.created'))
      queryClient.invalidateQueries({ queryKey: ['cashiers'] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      onClose()
    },
    onError: (e) => {
      setErrors(fields(e))
      notify(e)
    },
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal open={open} onClose={onClose} title={cashier ? t('cashiers.edit') : t('cashiers.add')} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate()}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('profile.firstName')} value={form.first_name || ''} onChange={set('first_name')} error={errors.first_name} required autoFocus />
          <Input label={t('profile.lastName')} value={form.last_name || ''} onChange={set('last_name')} error={errors.last_name} />
        </div>
        <Input label={t('cashiers.username')} value={form.username || ''} onChange={set('username')} error={errors.username} autoCapitalize="none" required />
        <Input label={t('profile.email')} type="email" value={form.email || ''} onChange={set('email')} error={errors.email} hint={t('cashiers.emailHint')} />
        {!cashier ? <Input label={t('auth.password')} type="password" autoComplete="new-password" value={form.password || ''} onChange={set('password')} error={errors.password} hint={t('profile.passwordHint')} required /> : null}
        <Select label={t('common.language')} value={form.preferred_language || 'en'} onChange={set('preferred_language')}>
          <option value="en">English</option>
          <option value="rw">Kinyarwanda</option>
        </Select>
        {!cashier ? <Toggle label={t('cashiers.activeNow')} checked={Boolean(form.is_active)} onChange={(v) => setForm({ ...form, is_active: v })} /> : null}
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ open, onClose, cashier }) {
  const { t } = useI18n()
  const { notify, fields } = useApiError()
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  useEffect(() => { if (open) { setPassword(''); setErrors({}) } }, [open])
  const mutation = useMutation({
    mutationFn: () => usersApi.resetPassword(cashier.id, password),
    onSuccess: () => { toast.success(t('cashiers.passwordReset')); onClose() },
    onError: (e) => { setErrors(fields(e)); notify(e) },
  })
  return (
    <Modal open={open} onClose={onClose} title={t('cashiers.resetPassword')} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={mutation.isPending} disabled={!password} onClick={() => mutation.mutate()}>{t('common.save')}</Button></>}>
      <p className="mb-3 text-sm text-muted">{t('cashiers.resetPasswordText', { name: cashier?.full_name })}</p>
      <Input label={t('profile.newPassword')} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.new_password} hint={t('profile.passwordHint')} autoFocus />
    </Modal>
  )
}

export default function CashiersPage() {
  const { t } = useI18n()
  const f = useFormat()
  const { notify } = useApiError()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [edit, setEdit] = useState(undefined)
  const [reset, setReset] = useState(null)
  const [toggle, setToggle] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ['cashiers', status], queryFn: () => usersApi.cashiers({ is_active: status, page_size: 100 }) })
  const toggleMutation = useMutation({
    mutationFn: (c) => (c.is_active ? usersApi.deactivate(c.id) : usersApi.activate(c.id)),
    onSuccess: (c) => {
      toast.success(t(c.is_active ? 'cashiers.activated' : 'cashiers.deactivated'))
      queryClient.invalidateQueries({ queryKey: ['cashiers'] })
      setToggle(null)
    },
    onError: notify,
  })

  return (
    <div>
      <PageHeader title={t('nav.cashiers')} subtitle={t('cashiers.subtitle')} actions={<Button icon={UserPlus} onClick={() => setEdit(null)}>{t('cashiers.add')}</Button>} />
      <Pills className="mb-4" size="sm" value={status} onChange={setStatus} options={[{ value: '', label: t('common.all') }, { value: 'true', label: t('cashiers.active') }, { value: 'false', label: t('cashiers.inactive') }]} />
      {isLoading ? (
        <PageLoader />
      ) : data?.results?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.results.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky/15 font-bold text-sky">
                    {(c.first_name?.[0] || c.username[0]).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.full_name}</p>
                    <p className="truncate text-xs text-muted">@{c.username}{c.email ? ` · ${c.email}` : ''}</p>
                  </div>
                </div>
                {c.is_active ? <Badge tone="success">{t('cashiers.active')}</Badge> : <Badge tone="danger">{t('cashiers.inactive')}</Badge>}
              </div>
              <p className="text-xs text-muted">{t('cashiers.lastLogin')}: {c.last_login ? f.dateTime(c.last_login) : t('cashiers.never')}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEdit(c)}>{t('common.edit')}</Button>
                <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setReset(c)}>{t('cashiers.resetPassword')}</Button>
                <Button size="sm" variant={c.is_active ? 'dangerGhost' : 'success'} icon={Power} onClick={() => setToggle(c)}>
                  {c.is_active ? t('cashiers.deactivate') : t('cashiers.activate')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card><EmptyState icon={UserCog} title={t('cashiers.empty')} action={<Button icon={UserPlus} onClick={() => setEdit(null)}>{t('cashiers.add')}</Button>} /></Card>
      )}
      <CashierModal open={edit !== undefined} onClose={() => setEdit(undefined)} cashier={edit} />
      <ResetPasswordModal open={Boolean(reset)} onClose={() => setReset(null)} cashier={reset} />
      <ConfirmDialog
        open={Boolean(toggle)}
        onClose={() => setToggle(null)}
        tone={toggle?.is_active ? 'danger' : 'success'}
        title={toggle?.is_active ? t('cashiers.deactivate') : t('cashiers.activate')}
        message={toggle ? t(toggle.is_active ? 'cashiers.deactivateText' : 'cashiers.activateText', { name: toggle.full_name }) : ''}
        loading={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate(toggle)}
      />
    </div>
  )
}
