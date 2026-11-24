import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const ACCESS_KEY = 'auth.access'
const REFRESH_KEY = 'auth.refresh'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 30000 })

api.interceptors.request.use((config) => {
  const access = tokens.access
  if (access && !config.skipAuth) config.headers.Authorization = `Bearer ${access}`
  const lang = localStorage.getItem('lang')
  if (lang) config.headers['Accept-Language'] = lang
  return config
})

// ---- Silent token refresh (one refresh at a time, queued requests retry) ----
let refreshPromise = null
let onSessionExpired = () => {}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

async function refreshAccessToken() {
  const refresh = tokens.refresh
  if (!refresh) throw new Error('No refresh token')
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh })
  tokens.set(data)
  return data.access
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    if (status === 401 && original && !original._retry && !original.skipAuth && tokens.refresh) {
      original._retry = true
      try {
        refreshPromise = refreshPromise || refreshAccessToken()
        const access = await refreshPromise
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch (refreshError) {
        tokens.clear()
        onSessionExpired()
        return Promise.reject(refreshError)
      } finally {
        refreshPromise = null
      }
    }
    return Promise.reject(error)
  },
)

/** Resolve a media URL coming from the API so it also works through the dev proxy. */
export function mediaUrl(url) {
  if (!url) return null
  if (/^https?:\/\//.test(API_BASE_URL)) return url
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}
