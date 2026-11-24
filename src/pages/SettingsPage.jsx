import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { settingsApi } from '../api'
import { mediaUrl } from '../api/client'
import { Button, Card, CardHeader, Input, PageHeader, PageLoader, Pills, Select, Textarea, Toggle } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'

const CURRENCIES = ['RWF', 'CDF', 'USD', 'KES', 'UGX', 'TZS', 'EUR', 'BIF']

function BusinessForm({ settings }) {
  const { t } = useI18n()
  const { notify, fields } = useApiError()
  const queryClient = useQueryClient()
  const fileRef = useRef(null)
  const [form, setForm] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const { logo_url: _logo, updated_at: _u, ...rest } = settings
    setForm({ ...rest, currency_other: CURRENCIES.includes(settings.currency) ? '' : settings.currency })
    setLogoFile(null)
    setRemoveLogo(false)
  }, [settings])

  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData()
      const currency = form.currency === 'OTHER' ? form.currency_other : form.currency
      const keys = ['business_name', 'phone_number', 'address', 'email', 'currency_decimals', 'default_language', 'receipt_footer', 'receipt_paper', 'receipt_show_logo', 'upcoming_pickup_days']
      keys.forEach((k) => data.append(k, form[k] ?? ''))
      data.append('currency', currency || 'RWF')
      if (logoFile) data.append('logo', logoFile)
      if (removeLogo) data.append('remove_logo', 'true')
      return settingsApi.update(data)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data)
      queryClient.invalidateQueries({ queryKey: ['branding'] })
      toast.success(t('settings.saved'))
      setErrors({})
    },
    onError: (e) => {
      setErrors(fields(e))
      notify(e)
    },
  })

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const preview = logoFile ? URL.createObjectURL(logoFile) : removeLogo ? null : mediaUrl(settings.logo_url)
  const currencyValue = CURRENCIES.includes(form.currency) ? form.currency : 'OTHER'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('settings.business')} />
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-white">
              {preview ? <img src={preview} alt="" className="size-full object-contain" /> : <ImagePlus className="size-6 text-muted" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { setLogoFile(e.target.files?.[0] || null); setRemoveLogo(false) }} />
              <Button size="sm" variant="secondary" icon={ImagePlus} onClick={() => fileRef.current?.click()}>{t('settings.uploadLogo')}</Button>
              {preview ? <Button size="sm" variant="dangerGhost" icon={Trash2} onClick={() => { setLogoFile(null); setRemoveLogo(true) }}>{t('common.remove')}</Button> : null}
              {errors.logo ? <p className="w-full text-xs text-danger">{errors.logo}</p> : <p className="w-full text-xs text-muted">{t('settings.logoHint')}</p>}
            </div>
          </div>
          <Input label={t('settings.businessName')} value={form.business_name || ''} onChange={set('business_name')} error={errors.business_name} required />
          <Input label={t('settings.phone')} type="tel" value={form.phone_number || ''} onChange={set('phone_number')} />
          <Input label={t('profile.email')} type="email" value={form.email || ''} onChange={set('email')} error={errors.email} />
          <Textarea label={t('settings.address')} value={form.address || ''} onChange={set('address')} rows={2} />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title={t('settings.currencyAndLanguage')} />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Select label={t('settings.currency')} value={currencyValue} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="OTHER">{t('settings.otherCurrency')}</option>
            </Select>
            {currencyValue === 'OTHER' ? <Input label={t('settings.currencyCode')} maxLength={3} value={form.currency_other || ''} onChange={(e) => setForm({ ...form, currency_other: e.target.value.toUpperCase() })} error={errors.currency} /> : null}
            <Select label={t('settings.decimals')} value={form.currency_decimals ?? 0} onChange={set('currency_decimals')}>
              {[0, 1, 2].map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label={t('settings.defaultLanguage')} value={form.default_language || 'en'} onChange={set('default_language')}>
              <option value="en">English</option>
              <option value="rw">Kinyarwanda</option>
            </Select>
            <Input label={t('settings.upcomingDays')} type="number" min="0" max="60" value={form.upcoming_pickup_days ?? 3} onChange={set('upcoming_pickup_days')} />
          </div>
        </Card>
        <Card>
          <CardHeader title={t('settings.receipts')} />
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('settings.paper')}</p>
              <Pills size="sm" value={form.receipt_paper} onChange={(v) => setForm({ ...form, receipt_paper: v })} options={['58mm', '80mm', 'A4'].map((p) => ({ value: p, label: p }))} />
            </div>
            <Toggle label={t('settings.showLogo')} checked={Boolean(form.receipt_show_logo)} onChange={(v) => setForm({ ...form, receipt_show_logo: v })} />
            <Textarea label={t('settings.footer')} value={form.receipt_footer || ''} onChange={set('receipt_footer')} rows={2} />
          </div>
        </Card>
      </div>
      <div className="lg:col-span-2 flex justify-end">
        <Button size="lg" icon={Save} loading={mutation.isPending} onClick={() => mutation.mutate()}>{t('common.save')}</Button>
      </div>
    </div>
  )
}

function TemplatesForm() {
  const { t } = useI18n()
  const { notify } = useApiError()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: settingsApi.templates })
  const [lang, setLang] = useState('en')
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)

  if (isLoading) return <PageLoader />
  const templates = data.results.filter((tpl) => tpl.language === lang)

  const save = async (tpl) => {
    setSaving(tpl.id)
    try {
      await settingsApi.updateTemplate(tpl.id, drafts[tpl.id])
      toast.success(t('settings.saved'))
      setDrafts((d) => { const n = { ...d }; delete n[tpl.id]; return n })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    } catch (e) {
      notify(e)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-sm text-muted">{t('settings.templatesHint')}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.keys(data.placeholders).map((p) => (
            <code key={p} title={data.placeholders[p]} className="rounded-lg bg-surface-strong px-2 py-1 text-xs">{`{${p}}`}</code>
          ))}
        </div>
      </Card>
      <Pills value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'rw', label: 'Kinyarwanda' }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((tpl) => {
          const value = drafts[tpl.id] ?? tpl.body
          return (
            <Card key={tpl.id}>
              <CardHeader title={t(`whatsapp.templates.${tpl.key}`)} />
              <Textarea rows={7} value={value} onChange={(e) => setDrafts({ ...drafts, [tpl.id]: e.target.value })} />
              <div className="mt-3 flex justify-end">
                <Button size="sm" icon={Save} disabled={drafts[tpl.id] === undefined || drafts[tpl.id] === tpl.body} loading={saving === tpl.id} onClick={() => save(tpl)}>{t('common.save')}</Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState('business')
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  return (
    <div>
      <PageHeader title={t('nav.settings')} />
      <Pills className="mb-4" value={tab} onChange={setTab} options={[{ value: 'business', label: t('settings.business') }, { value: 'templates', label: t('settings.templates') }]} />
      {tab === 'business' ? (isLoading ? <PageLoader /> : <BusinessForm settings={data} />) : <TemplatesForm />}
    </div>
  )
}
