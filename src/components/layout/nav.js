import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  History,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Tags,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'

/** Every page of the app. `admin: true` pages are hidden from cashiers. */
export const NAV_ITEMS = [
  { key: 'dashboard', to: '/', icon: LayoutDashboard, end: true },
  { key: 'newOrder', to: '/orders/new', icon: PlusCircle },
  { key: 'orders', to: '/orders', icon: ClipboardList },
  { key: 'customers', to: '/customers', icon: Users },
  { key: 'payments', to: '/payments', icon: Wallet },
  { key: 'pickups', to: '/pickups', icon: CalendarClock },
  { key: 'analytics', to: '/analytics', icon: BarChart3, admin: true },
  { key: 'catalog', to: '/catalog', icon: Tags, admin: true },
  { key: 'cashiers', to: '/cashiers', icon: UserCog, admin: true },
  { key: 'activity', to: '/activity', icon: History, admin: true },
  { key: 'settings', to: '/settings', icon: Settings, admin: true },
]

/** Pill tabs in the desktop top bar (as in the design reference). */
export const TOP_TABS = ['dashboard', 'orders', 'customers', 'payments', 'pickups']

/** Mobile bottom bar: four destinations + "More" (New Order sits in the middle). */
export const BOTTOM_TABS = ['dashboard', 'orders', 'newOrder', 'pickups']

export function navFor(isAdmin) {
  return NAV_ITEMS.filter((item) => isAdmin || !item.admin)
}

/** Is this nav item the current page? ("/orders/new" belongs to New Order, not Orders.) */
export function isNavActive(item, pathname) {
  if (item.to === '/') return pathname === '/'
  if (item.key === 'orders') return pathname.startsWith('/orders') && !pathname.startsWith('/orders/new')
  return pathname === item.to || pathname.startsWith(item.to + '/')
}
