import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppLayout from './components/layout/AppLayout'
import { FullScreenLoader, PageLoader } from './components/ui'
import { useAuth } from './context/AuthContext'
import { useI18n } from './context/I18nContext'
import { useTheme } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const NewOrderPage = lazy(() => import('./pages/NewOrderPage'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const PickupsPage = lazy(() => import('./pages/PickupsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const CashiersPage = lazy(() => import('./pages/CashiersPage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RequireAuth() {
  const { user, booting } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  if (booting) return <FullScreenLoader label={t('common.loading')} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

function RequireAdmin() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  const { isDark } = useTheme()
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route
              element={
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/new" element={<NewOrderPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="pickups" element={<PickupsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<RequireAdmin />}>
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="cashiers" element={<CashiersPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
      <Toaster position="top-center" richColors closeButton theme={isDark ? 'dark' : 'light'} toastOptions={{ style: { borderRadius: '1rem' } }} />
    </>
  )
}
