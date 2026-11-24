import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Download,
  Globe,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { authApi, reportsApi } from '../../api'
import { mediaUrl } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { LANGUAGES, useI18n } from '../../context/I18nContext'
import { useTheme } from '../../context/ThemeContext'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { useSettings } from '../../hooks/useSettings'
import { cn } from '../../lib/cn'
import { IconButton, Modal } from '../ui'
import { BOTTOM_TABS, isNavActive, navFor, TOP_TABS } from './nav'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Brand({ compact }) {
  const settings = useSettings()
  const logo = mediaUrl(settings.logo_url)
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 rounded-full bg-surface-strong border border-line', compact ? 'h-11 pl-1.5 pr-4' : 'h-14 pl-2 pr-5')}>
      <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-white', compact ? 'size-8' : 'size-10')}>
        <img src={logo || '/icons/icon-192.png'} alt="" className="size-full object-contain" />
      </span>
      <span className={cn('truncate font-bold tracking-tight', compact ? 'max-w-[9rem] text-sm' : 'max-w-[12rem] text-[17px]')}>
        {settings.business_name}
      </span>
    </Link>
  )
}

function useNotifications(isAdmin) {
  const { data } = useQuery({
    queryKey: ['dashboard', 'summary', 'today'],
    queryFn: () => reportsApi.summary({ period: 'today' }),
    refetchInterval: 60_000,
  })
  const overdue = data?.overdue_pickups_count || 0
  const approvals = isAdmin ? data?.pending_collection_approvals || 0 : 0
  const ready = data?.ready_for_pickup_count || 0
  return { overdue, approvals, ready, total: overdue + approvals }
}

function NotificationsPanel({ open, onClose, notes }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const go = (to) => {
    onClose()
    navigate(to)
  }
  const rows = [
    { key: 'approvals', count: notes.approvals, to: '/orders?collection_approval=PENDING', tone: 'bg-warning/18 text-warning' },
    { key: 'overdue', count: notes.overdue, to: '/pickups?tab=overdue', tone: 'bg-danger/12 text-danger' },
    { key: 'ready', count: notes.ready, to: '/orders?status=READY', tone: 'bg-sky/15 text-sky' },
  ].filter((row) => row.count > 0)
  return (
    <Modal open={open} onClose={onClose} title={t('notifications.title')} size="sm">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('notifications.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <button key={row.key} type="button" onClick={() => go(row.to)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-strong p-3 text-left hover:bg-surface">
              <span className={cn('grid size-10 place-items-center rounded-full font-bold', row.tone)}>{row.count}</span>
              <span className="text-sm font-medium">{t(`notifications.${row.key}`, { count: row.count })}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

function InstallHelp({ open, onClose }) {
  const { t } = useI18n()
  return (
    <Modal open={open} onClose={onClose} title={t('install.title')} size="sm">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>{t('install.iosStep1')}</li>
        <li>{t('install.iosStep2')}</li>
        <li>{t('install.iosStep3')}</li>
      </ol>
    </Modal>
  )
}

/** Menu with preferences, account actions and (on phones) the remaining pages. */
function MoreMenu({ open, onClose, items }) {
  const { t, lang, setLang } = useI18n()
  const { isDark, toggle } = useTheme()
  const { user, logout, updateUser } = useAuth()
  const { canInstall, isIOS, install } = useInstallPrompt()
  const [iosHelp, setIosHelp] = useState(false)
  const navigate = useNavigate()

  const changeLanguage = async (code) => {
    setLang(code)
    updateUser({ preferred_language: code })
    try {
      await authApi.updateMe({ preferred_language: code })
    } catch {
      /* preference stays local */
    }
  }

  const go = (to) => {
    onClose()
    navigate(to)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={user?.full_name} size="sm">
        <p className="-mt-2 mb-4 text-sm text-muted">{t(`roles.${user?.role}`)}</p>

        {items.length ? (
          <div className="mb-4 grid grid-cols-3 gap-2 md:hidden">
            {items.map((item) => (
              <button key={item.key} type="button" onClick={() => go(item.to)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface-strong px-2 py-3 text-center">
                <item.icon className="size-5" />
                <span className="text-xs font-semibold leading-tight">{t(`nav.${item.key}`)}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface-strong p-1.5">
          <div className="flex items-center justify-between gap-2 px-2.5 py-2">
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <Globe className="size-4" /> {t('common.language')}
            </span>
            <div className="flex gap-1">
              {LANGUAGES.map((l) => (
                <button key={l.code} type="button" onClick={() => changeLanguage(l.code)} className={cn('h-8 rounded-full px-3 text-xs font-bold', lang === l.code ? 'bg-primary text-primary-ink' : 'bg-line')}>
                  {l.short}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={toggle} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium hover:bg-line">
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {isDark ? t('common.lightMode') : t('common.darkMode')}
          </button>
          {canInstall || isIOS ? (
            <button
              type="button"
              onClick={async () => {
                if (canInstall) {
                  if (await install()) toast.success(t('install.done'))
                } else setIosHelp(true)
              }}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium hover:bg-line"
            >
              <Download className="size-4" /> {t('install.action')}
            </button>
          ) : null}
          <button type="button" onClick={() => go('/profile')} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium hover:bg-line">
            <KeyRound className="size-4" /> {t('nav.profile')}
          </button>
          <button type="button" onClick={() => { onClose(); logout() }} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger/10">
            <LogOut className="size-4" /> {t('auth.logout')}
          </button>
        </div>
      </Modal>
      <InstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </>
  )
}

export default function AppLayout() {
  const { t } = useI18n()
  const { user, isAdmin, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const notes = useNotifications(isAdmin)

  const items = navFor(isAdmin)
  const byKey = Object.fromEntries(items.map((item) => [item.key, item]))
  const moreItems = items.filter((item) => !BOTTOM_TABS.includes(item.key))
  const moreActive = moreItems.some((item) => isNavActive(item, location.pathname))

  return (
    <div className="min-h-dvh">
      {/* ---------------- Desktop / tablet top bar ---------------- */}
      <header className="sticky top-0 z-30 hidden px-6 pt-5 pb-3 md:block">
        <div className="flex items-center gap-3">
          <Brand />
          <div className="ml-2 flex items-center gap-2">
            <IconButton icon={Search} label={t('common.search')} onClick={() => navigate('/orders?focus=search')} />
          </div>
          <div className="flex-1 xl:hidden" />
          <nav className="scroll-thin ml-1 hidden flex-1 items-center gap-2 overflow-x-auto xl:flex">
            {TOP_TABS.map((key) => byKey[key]).filter(Boolean).map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={() =>
                  cn(
                    'h-12 shrink-0 rounded-full px-5 text-[15px] font-medium leading-[48px] transition',
                    isNavActive(item, location.pathname) ? 'bg-surface-strong shadow-soft font-semibold border border-line' : 'text-ink/80 hover:bg-surface-strong/60',
                  )
                }
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <IconButton icon={isDark ? Sun : Moon} label={isDark ? t('common.lightMode') : t('common.darkMode')} onClick={toggle} />
            <IconButton icon={Bell} label={t('notifications.title')} badge={notes.total} onClick={() => setNotesOpen(true)} />
            <button type="button" onClick={() => setMenuOpen(true)} className="grid size-12 place-items-center rounded-full bg-sky/20 font-bold text-sky ring-2 ring-surface-strong" aria-label={t('common.account')}>
              {initials(user?.full_name)}
            </button>
            <Link to="/orders/new" aria-label={t('nav.newOrder')} title={t('nav.newOrder')} className="grid size-12 place-items-center rounded-full bg-primary text-primary-ink shadow-soft hover:opacity-90">
              <Plus className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Mobile top bar ---------------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-canvas/80 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-lg md:hidden">
        <Brand compact />
        <div className="flex items-center gap-2">
          <IconButton icon={Bell} label={t('notifications.title')} badge={notes.total} onClick={() => setNotesOpen(true)} className="size-10" />
          <button type="button" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-full bg-sky/20 text-sm font-bold text-sky" aria-label={t('common.account')}>
            {initials(user?.full_name) || <UserRound className="size-4" />}
          </button>
        </div>
      </header>

      <div className="flex gap-6 px-4 md:px-6">
        {/* ---------------- Round icon sidebar ---------------- */}
        <aside className="sticky top-28 hidden h-[calc(100dvh-8.5rem)] w-14 shrink-0 flex-col justify-between md:flex">
          <nav className="flex flex-col items-center gap-2.5 rounded-full border border-line bg-surface p-1.5">
            {items.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                title={t(`nav.${item.key}`)}
                aria-label={t(`nav.${item.key}`)}
                className={() =>
                  cn(
                    'group relative grid size-11 place-items-center rounded-full transition',
                    isNavActive(item, location.pathname) ? 'bg-primary text-primary-ink' : 'bg-surface-strong hover:bg-surface-solid',
                  )
                }
              >
                <item.icon className="size-[18px]" />
                <span className="pointer-events-none absolute left-14 z-40 hidden whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-ink shadow-soft group-hover:block">
                  {t(`nav.${item.key}`)}
                </span>
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-col items-center gap-2.5 rounded-full border border-line bg-surface p-1.5">
            <NavLink to="/profile" title={t('nav.profile')} className={() => cn('grid size-11 place-items-center rounded-full', location.pathname === '/profile' ? 'bg-primary text-primary-ink' : 'bg-surface-strong')}>
              <UserRound className="size-[18px]" />
            </NavLink>
            <button type="button" onClick={logout} title={t('auth.logout')} aria-label={t('auth.logout')} className="grid size-11 place-items-center rounded-full bg-surface-strong hover:bg-danger hover:text-white">
              <LogOut className="size-[18px] rotate-180" />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pt-2 pb-28 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* ---------------- Mobile bottom navigation (icon + label) ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-solid/95 backdrop-blur-xl pb-safe md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
          {BOTTOM_TABS.map((key) => byKey[key]).filter(Boolean).map((item) =>
            item.key === 'newOrder' ? (
              <NavLink key={item.key} to={item.to} className="-mt-5 flex flex-col items-center gap-1">
                <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-ink shadow-lg ring-4 ring-canvas">
                  <Plus className="size-6" />
                </span>
                <span className="text-[11px] font-semibold">{t('nav.new')}</span>
              </NavLink>
            ) : (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={cn('flex flex-col items-center gap-1 rounded-2xl py-1.5', isNavActive(item, location.pathname) ? 'text-ink' : 'text-muted')}
              >
                <span className={cn('grid h-8 w-14 place-items-center rounded-full transition', isNavActive(item, location.pathname) && 'bg-primary text-primary-ink')}>
                  <item.icon className="size-5" />
                </span>
                <span className={cn('text-[11px]', isNavActive(item, location.pathname) ? 'font-bold' : 'font-medium')}>{t(`nav.${item.key}`)}</span>
              </NavLink>
            ),
          )}
          <button type="button" onClick={() => setMenuOpen(true)} className={cn('flex flex-col items-center gap-1 rounded-2xl py-1.5', moreActive ? 'text-ink' : 'text-muted')}>
            <span className={cn('grid h-8 w-14 place-items-center rounded-full', moreActive && 'bg-primary text-primary-ink')}>
              <Menu className="size-5" />
            </span>
            <span className={cn('text-[11px]', moreActive ? 'font-bold' : 'font-medium')}>{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      <MoreMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={moreItems} />
      <NotificationsPanel open={notesOpen} onClose={() => setNotesOpen(false)} notes={notes} />
    </div>
  )
}
