import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { useAuth } from '../context/AuthContext'

const DEFAULTS = {
  business_name: 'Laundry POS',
  currency: 'RWF',
  currency_decimals: 0,
  receipt_paper: '80mm',
  upcoming_pickup_days: 3,
}

export function useSettings() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  })
  return { ...DEFAULTS, ...(query.data || {}), loaded: Boolean(query.data) }
}
