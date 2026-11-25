import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { catalogApi } from '../api'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, PageLoader, Pills, SearchInput, Select, Textarea, Toggle } from '../components/ui'
import { useI18n } from '../context/I18nContext'
import { useApiError } from '../hooks/useApiError'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'

function useSave(fn, keys, message, onDone) {
  const queryClient = useQueryClient()
  const { notify, fields } = useApiError()
  const { t } = useI18n()
  const [errors, setErrors] = useState({})
  const mutation = useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }))
      toast.success(t(message))
      onDone?.()
    },
    onError: (e) => {
      setErrors(fields(e))
      notify(e)
    },
  })
  return { mutation, errors, setErrors }
}

function CategoryModal({ open, onClose, category }) {
  const { t } = useI18n()
  const [form, setForm] = useState({})
  const { mutation, errors, setErrors } = useSave(
    () => (category ? catalogApi.updateCategory(category.id, form) : catalogApi.createCategory(form)),
    ['categories', 'catalog', 'services'],
    'catalog.saved',
    onClose,
  )
  useEffect(() => {
    if (open) {
      setForm(category ? { name: category.name, description: category.description, display_order: category.display_order, is_active: category.is_active } : { name: '', description: '', display_order: 0, is_active: true })
      setErrors({})
    }
  }, [open, category, setErrors])
  return (
    <Modal open={open} onClose={onClose} title={category ? t('catalog.editCategory') : t('catalog.addCategory')} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate()}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-3.5">
        <Input label={t('common.name')} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required autoFocus />
        <Textarea label={t('common.description')} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <Input label={t('catalog.displayOrder')} type="number" min="0" value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
        <Toggle label={t('catalog.active')} description={t('catalog.activeHint')} checked={Boolean(form.is_active)} onChange={(v) => setForm({ ...form, is_active: v })} />
      </div>
    </Modal>
  )
}

function ServiceModal({ open, onClose, service, categories, defaultCategory }) {
  const { t } = useI18n()
  const [form, setForm] = useState({})
  const { mutation, errors, setErrors } = useSave(
    () => (service ? catalogApi.updateService(service.id, form) : catalogApi.createService(form)),
    ['services', 'catalog', 'categories'],
    'catalog.saved',
    onClose,
  )
  useEffect(() => {
    if (open) {
      setForm(
        service
          ? { category: service.category, name: service.name, description: service.description, normal_price: service.normal_price, express_price: service.express_price, display_order: service.display_order, is_active: service.is_active }
          : { category: defaultCategory || categories[0]?.id || '', name: '', description: '', normal_price: '', express_price: '', display_order: 0, is_active: true },
      )
      setErrors({})
    }
  }, [open, service, categories, defaultCategory, setErrors])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Modal open={open} onClose={onClose} title={service ? t('catalog.editService') : t('catalog.addService')} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={mutation.isPending} onClick={() => mutation.mutate()}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-3.5">
        <Select label={t('analytics.category')} value={form.category || ''} onChange={set('category')} error={errors.category} required>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ` (${t('catalog.inactive')})`}</option>)}
        </Select>
        <Input label={t('common.name')} value={form.name || ''} onChange={set('name')} error={errors.name} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('catalog.normalPrice')} type="number" inputMode="decimal" min="0" step="any" value={form.normal_price ?? ''} onChange={set('normal_price')} error={errors.normal_price} required />
          <Input label={t('catalog.expressPrice')} type="number" inputMode="decimal" min="0" step="any" value={form.express_price ?? ''} onChange={set('express_price')} error={errors.express_price} required />
        </div>
        {service ? <p className="text-xs text-muted">{t('catalog.priceChangeHint')}</p> : null}
        <Textarea label={t('common.description')} value={form.description || ''} onChange={set('description')} rows={2} />
        <Input label={t('catalog.displayOrder')} type="number" min="0" value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
        <Toggle label={t('catalog.active')} description={t('catalog.activeHint')} checked={Boolean(form.is_active)} onChange={(v) => setForm({ ...form, is_active: v })} />
      </div>
    </Modal>
  )
}

export default function CatalogPage() {
  const { t } = useI18n()
  const f = useFormat()
  const [tab, setTab] = useState('services')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editCategory, setEditCategory] = useState(undefined) // undefined = closed, null = new
  const [editService, setEditService] = useState(undefined)

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => catalogApi.categories() })
  const services = useQuery({ queryKey: ['services'], queryFn: () => catalogApi.services() })
  const cats = categories.data || []

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (services.data?.results || []).filter(
      (s) => (!categoryFilter || s.category === categoryFilter) && (!term || s.name.toLowerCase().includes(term) || s.category_name.toLowerCase().includes(term)),
    )
  }, [services.data, search, categoryFilter])

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach((s) => {
      if (!map.has(s.category)) map.set(s.category, { name: s.category_name, active: s.category_is_active, items: [] })
      map.get(s.category).items.push(s)
    })
    return [...map.entries()]
  }, [filtered])

  if (categories.isLoading || services.isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title={t('nav.catalog')}
        subtitle={t('catalog.subtitle')}
        actions={
          tab === 'services' ? (
            <Button icon={Plus} disabled={!cats.length} onClick={() => setEditService(null)}>{t('catalog.addService')}</Button>
          ) : (
            <Button icon={Plus} onClick={() => setEditCategory(null)}>{t('catalog.addCategory')}</Button>
          )
        }
      />
      <Pills className="mb-4" value={tab} onChange={setTab} options={[{ value: 'services', label: t('catalog.servicesTab') }, { value: 'categories', label: t('catalog.categoriesTab'), count: cats.length }]} />

      {tab === 'categories' ? (
        <Card>
          {cats.length ? (
            <div className="divide-y divide-line">
              {cats.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">{c.name} {!c.is_active ? <Badge tone="danger">{t('catalog.inactive')}</Badge> : null}</p>
                    <p className="text-xs text-muted">{t('catalog.itemsCount', { active: c.active_items_count, total: c.items_count })}{c.description ? ` · ${c.description}` : ''}</p>
                  </div>
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditCategory(c)}>{t('common.edit')}</Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Tags} title={t('catalog.noCategories')} description={t('catalog.noCategoriesHint')} action={<Button icon={Plus} onClick={() => setEditCategory(null)}>{t('catalog.addCategory')}</Button>} />
          )}
        </Card>
      ) : (
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder={t('catalog.searchPlaceholder')} className="flex-1" />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-56">
              <option value="">{t('catalog.allCategories')}</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          {!cats.length ? (
            <EmptyState icon={Tags} title={t('catalog.noCategories')} description={t('catalog.noCategoriesHint')} action={<Button icon={Plus} onClick={() => { setTab('categories'); setEditCategory(null) }}>{t('catalog.addCategory')}</Button>} />
          ) : grouped.length ? (
            <div className="flex flex-col gap-5">
              {grouped.map(([catId, group]) => (
                <div key={catId}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold">{group.name} {!group.active ? <Badge tone="danger">{t('catalog.inactive')}</Badge> : null}</h3>
                    <button type="button" className="text-sm font-semibold text-sky" onClick={() => { setCategoryFilter(''); setEditService({ __new: true, category: catId }) }}>+ {t('common.add')}</button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-line">
                    <div className="hidden grid-cols-[1fr_130px_130px_100px_90px] gap-3 bg-surface-strong px-4 py-2.5 text-xs font-medium text-muted md:grid">
                      <span>{t('common.name')}</span><span className="text-right">{t('serviceType.NORMAL')}</span><span className="text-right">{t('serviceType.EXPRESS')}</span><span className="text-right">{t('catalog.customColumn')}</span><span>{t('orders.status')}</span><span />
                    </div>
                    {group.items.map((s) => (
                      <div key={s.id} className={cn('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-line px-4 py-3 first:border-t-0 md:grid-cols-[1fr_120px_120px_120px_100px_90px] md:first:border-t', !s.is_active && 'opacity-60')}>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{s.name}</p>
                          {s.description ? <p className="truncate text-xs text-muted">{s.description}</p> : null}
                          <p className="tabular text-xs text-muted md:hidden">{f.money(s.normal_price)} · {t('serviceType.EXPRESS')} {f.money(s.express_price)}</p>
                        </div>
                        <span className="tabular hidden text-right md:block">{f.money(s.normal_price)}</span>
                        <span className="tabular hidden text-right font-semibold md:block">{f.money(s.express_price)}</span>
                        <span className="hidden text-right text-xs text-muted md:block">{t('catalog.customAtOrder')}</span>
                        <span className="hidden md:block">{s.is_active ? <Badge tone="success">{t('catalog.active')}</Badge> : <Badge tone="danger">{t('catalog.inactive')}</Badge>}</span>
                        <div className="text-right">
                          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditService(s)}><span className="hidden lg:inline">{t('common.edit')}</span></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Tags} title={t('catalog.noServices')} action={<Button icon={Plus} onClick={() => setEditService(null)}>{t('catalog.addService')}</Button>} />
          )}
        </Card>
      )}

      <CategoryModal open={editCategory !== undefined} onClose={() => setEditCategory(undefined)} category={editCategory} />
      <ServiceModal
        open={editService !== undefined}
        onClose={() => setEditService(undefined)}
        service={editService && !editService.__new ? editService : null}
        defaultCategory={editService?.__new ? editService.category : categoryFilter}
        categories={cats}
      />
    </div>
  )
}
