import { forwardRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useI18n } from '../../context/I18nContext'

/* ------------------------------------------------------------------ Buttons */
const VARIANTS = {
  primary: 'bg-primary text-primary-ink hover:opacity-90',
  secondary: 'bg-surface-strong text-ink border border-line hover:bg-surface-solid',
  ghost: 'text-ink hover:bg-surface-strong',
  dangerGhost: 'text-danger hover:bg-danger/10',
  danger: 'bg-danger text-white hover:opacity-90',
  success: 'bg-success text-white hover:opacity-90',
  accent: 'bg-accent text-accent-ink hover:opacity-90',
}
const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, loading, disabled, children, icon: Icon, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold transition select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-sky',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
    </button>
  )
})

export function IconButton({ icon: Icon, label, className, active, badge, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full transition',
        active ? 'bg-primary text-primary-ink' : 'bg-surface-strong text-ink border border-line hover:bg-surface-solid',
        className,
      )}
      {...props}
    >
      <Icon className="size-[18px]" />
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold grid place-items-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  )
}

export function Spinner({ className }) {
  return (
    <span
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      aria-hidden
    />
  )
}

/* ------------------------------------------------------------------ Loader (washing GIF) */
export function WashingLoader({ size = 120, label, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status">
      <div className="rounded-full bg-white p-2 shadow-soft" style={{ width: size, height: size }}>
        <img src="/washing.gif" alt="" className="size-full rounded-full object-contain" />
      </div>
      {label ? <p className="text-sm font-medium text-muted">{label}</p> : null}
    </div>
  )
}

export function FullScreenLoader({ label }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-canvas">
      <WashingLoader size={150} label={label} />
    </div>
  )
}

export function PageLoader() {
  const { t } = useI18n()
  return <WashingLoader className="py-20" size={110} label={t('common.loading')} />
}

/* ------------------------------------------------------------------ Card */
export function Card({ className, children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('card p-5', className)} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Stat card (like the design reference) */
export function StatCard({ title, value, hint, icon: Icon, onClick, tone = 'accent', loading }) {
  const toneClass = {
    accent: 'bg-accent text-accent-ink',
    sky: 'bg-sky/15 text-sky',
    danger: 'bg-danger/12 text-danger',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-warning',
  }[tone]
  return (
    <div onClick={onClick} className={cn('card flex min-h-[132px] flex-col justify-between p-4 sm:min-h-[150px] sm:p-5', onClick && 'cursor-pointer active:scale-[0.99] transition')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight sm:text-[15px]">{title}</p>
        {Icon ? (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-full sm:size-11', toneClass)}>
            <Icon className="size-4 sm:size-5" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 sm:mt-4">
        <div className="min-w-0">
          <p className="tabular text-xl font-bold tracking-tight break-words sm:text-[28px] sm:leading-tight">
            {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded-lg bg-line" /> : value}
          </p>
          {hint ? <p className="mt-1 line-clamp-2 text-xs text-muted">{hint}</p> : null}
        </div>
        {onClick ? (
          <button
            type="button"
            aria-label={title}
            className="hidden size-10 shrink-0 place-items-center rounded-full border border-line bg-surface-strong transition hover:bg-primary hover:text-primary-ink sm:grid"
          >
            <ArrowUpRight className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Form fields */
export function Field({ label, error, hint, children, className, required, htmlFor }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, error, hint, className, required, id, ...props }, ref) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={inputId}>
      <input ref={ref} id={inputId} className="field" aria-invalid={Boolean(error)} required={required} {...props} />
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, id, rows = 3, ...props }, ref) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={inputId}>
      <textarea ref={ref} id={inputId} rows={rows} className="field resize-y" aria-invalid={Boolean(error)} {...props} />
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, error, hint, className, id, children, required, ...props }, ref) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <Field label={label} error={error} hint={hint} className={className} required={required} htmlFor={inputId}>
      <select ref={ref} id={inputId} className="field appearance-none bg-no-repeat pr-9" aria-invalid={Boolean(error)} {...props}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b717b' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 0.8rem center' }}>
        {children}
      </select>
    </Field>
  )
})

export function SearchInput({ value, onChange, placeholder, className, autoFocus }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field rounded-full! pl-10"
      />
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-success' : 'bg-line')}
      >
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </label>
  )
}

/* ------------------------------------------------------------------ Pills / segmented tabs */
export function Pills({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('scroll-thin flex gap-2 overflow-x-auto', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'shrink-0 rounded-full font-semibold transition border',
            size === 'sm' ? 'h-8 px-3.5 text-xs' : 'h-10 px-4 text-sm',
            value === option.value
              ? 'bg-primary text-primary-ink border-transparent'
              : 'bg-surface-strong text-ink border-line hover:bg-surface-solid',
          )}
        >
          {option.label}
          {option.count != null ? <span className="ml-1.5 opacity-60">{option.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ Badge */
const BADGE_TONES = {
  neutral: 'bg-line text-ink',
  sky: 'bg-sky/15 text-sky',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/18 text-warning',
  danger: 'bg-danger/12 text-danger',
  accent: 'bg-accent text-accent-ink',
  dark: 'bg-primary text-primary-ink',
}
export function Badge({ tone = 'neutral', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', BADGE_TONES[tone], className)}>
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ Modal (bottom sheet on phones) */
export function Modal({ open, onClose, title, children, footer, size = 'md', className }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-surface-solid shadow-2xl sm:rounded-[1.75rem]',
          width,
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-line">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 pb-safe">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ Page header */
export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          <button type="button" onClick={back} className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-strong border border-line" aria-label="Back">
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Empty state */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {Icon ? (
        <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon className="size-6" />
        </span>
      ) : null}
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Pagination */
export function Pagination({ page, count, pageSize = 20, onChange }) {
  const { t } = useI18n()
  const pages = Math.max(1, Math.ceil((count || 0) / pageSize))
  if (pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{t('common.pageOf', { page, pages })}</span>
      <div className="flex gap-2">
        <IconButton icon={ChevronLeft} label={t('common.previous')} disabled={page <= 1} onClick={() => onChange(page - 1)} className="disabled:opacity-40" />
        <IconButton icon={ChevronRight} label={t('common.next')} disabled={page >= pages} onClick={() => onChange(page + 1)} className="disabled:opacity-40" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Key/value row */
export function InfoRow({ label, children, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2 text-sm', className)}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}
