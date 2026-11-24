import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, KeyRound, LogOut, Monitor, Moon, Save, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '../api'
import { tokens } from '../api/client'
import { Button, Card, CardHeader, Input, PageHeader, Pills } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES, useI18n } from '../context/I18nContext'
import { useTheme } from '../context/ThemeContext'
import { useApiError } from '../hooks/useApiError'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export default function ProfilePage() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const { user, updateUser, logout } = useAuth()
  const { notify, fields } = useApiError()
  const { canInstall, isIOS, installed, install } = useInstallPrompt()
  const [profile, setProfile] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email })
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [errors, setErrors] = useState({})

  const saveProfile = useMutation({
    mutationFn: () => authApi.updateMe(profile),
    onSuccess: (data) => { updateUser(data); toast.success(t('profile.saved')) },
    onError: (e) => { setErrors(fields(e)); notify(e) },
  })
  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: pw.current_password, new_password: pw.new_password }),
    onSuccess: (data) => {
      tokens.set(data)
      setPw({ current_password: '', new_password: '', confirm: '' })
      setErrors({})
      toast.success(t('profile.passwordChanged'))
    },
    onError: (e) => { setErrors(fields(e)); notify(e) },
  })

  const changeLanguage = (code) => {
    setLang(code)
    updateUser({ preferred_language: code })
    authApi.updateMe({ preferred_language: code }).catch(() => {})
  }
  const mismatch = pw.confirm && pw.new_password !== pw.confirm

  return (
    <div>
      <PageHeader title={t('nav.profile')} subtitle={`${user.full_name} · ${t(`roles.${user.role}`)}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('profile.preferences')} />
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('common.language')}</p>
              <Pills value={lang} onChange={changeLanguage} options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('profile.theme')}</p>
              <Pills
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="size-4" />{t('profile.light')}</span> },
                  { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="size-4" />{t('profile.dark')}</span> },
                  { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="size-4" />{t('profile.system')}</span> },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('install.title')}</p>
              {installed ? (
                <p className="text-sm text-success">{t('install.installed')}</p>
              ) : canInstall ? (
                <Button variant="secondary" icon={Download} onClick={async () => (await install()) && toast.success(t('install.done'))}>{t('install.action')}</Button>
              ) : isIOS ? (
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
                  <li>{t('install.iosStep1')}</li>
                  <li>{t('install.iosStep2')}</li>
                  <li>{t('install.iosStep3')}</li>
                </ol>
              ) : (
                <p className="text-sm text-muted">{t('install.browserHint')}</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('profile.details')} />
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('profile.firstName')} value={profile.first_name || ''} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
              <Input label={t('profile.lastName')} value={profile.last_name || ''} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
            </div>
            <Input label={t('profile.email')} type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} error={errors.email} />
            <Input label={t('cashiers.username')} value={user.username} disabled />
            <Button icon={Save} loading={saveProfile.isPending} onClick={() => saveProfile.mutate()} className="self-end">{t('common.save')}</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('profile.changePassword')} />
          <div className="flex flex-col gap-3.5">
            <Input label={t('profile.currentPassword')} type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} error={errors.current_password} />
            <Input label={t('profile.newPassword')} type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} error={errors.new_password} hint={t('profile.passwordHint')} />
            <Input label={t('profile.confirmPassword')} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={mismatch ? t('profile.mismatch') : null} />
            <Button icon={KeyRound} loading={changePassword.isPending} disabled={!pw.current_password || !pw.new_password || mismatch} onClick={() => changePassword.mutate()} className="self-end">{t('profile.changePassword')}</Button>
          </div>
        </Card>

        <Card className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{t('profile.logoutHint')}</p>
          <Button variant="danger" icon={LogOut} onClick={logout}>{t('auth.logout')}</Button>
        </Card>
      </div>
    </div>
  )
}
