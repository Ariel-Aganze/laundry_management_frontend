import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, LogIn, Moon, Sun } from 'lucide-react'
import { settingsApi } from '../api'
import { mediaUrl } from '../api/client'
import { Button, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES, useI18n } from '../context/I18nContext'
import { useTheme } from '../context/ThemeContext'
import { useApiError } from '../hooks/useApiError'
import { cn } from '../lib/cn'

export default function LoginPage() {
  const { t, lang, setLang } = useI18n()
  const { isDark, toggle } = useTheme()
  const { user, login } = useAuth()
  const { message } = useApiError()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ login: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const branding = useQuery({ queryKey: ['branding'], queryFn: settingsApi.public, staleTime: Infinity, retry: false })

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.login.trim(), form.password)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(message(err))
    } finally {
      setLoading(false)
    }
  }

  const logo = mediaUrl(branding.data?.logo_url)

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <div className="flex justify-end gap-2">
        <div className="flex rounded-full border border-line bg-surface-strong p-1">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)} className={cn('h-8 rounded-full px-3 text-xs font-bold', lang === l.code ? 'bg-primary text-primary-ink' : '')}>
              {l.short}
            </button>
          ))}
        </div>
        <button type="button" onClick={toggle} className="grid size-10 place-items-center rounded-full border border-line bg-surface-strong" aria-label="Theme">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="card w-full max-w-md p-7 sm:p-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 size-24 overflow-hidden rounded-full bg-white p-1.5 shadow-soft">
              <img src={logo || '/washing.gif'} alt="" className="size-full rounded-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{branding.data?.business_name || t('app.name')}</h1>
            <p className="mt-1 text-sm text-muted">{t('auth.subtitle')}</p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input
              label={t('auth.login')}
              autoComplete="username"
              autoCapitalize="none"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              required
              autoFocus
            />
            <div className="relative">
              <Input
                label={t('auth.password')}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-[38px] text-muted" aria-label={t('auth.showPassword')}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p> : null}
            <Button type="submit" size="lg" icon={LogIn} loading={loading} className="mt-2 w-full">
              {t('auth.signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
