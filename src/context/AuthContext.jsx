import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { setSessionExpiredHandler, tokens } from '../api/client'
import { useI18n } from './I18nContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(Boolean(tokens.access))
  const { setLang } = useI18n()
  const queryClient = useQueryClient()

  const clearSession = useCallback(() => {
    tokens.clear()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionExpiredHandler(clearSession)
  }, [clearSession])

  useEffect(() => {
    if (!tokens.access) return
    authApi
      .me()
      .then((me) => {
        setUser(me)
        if (me.preferred_language) setLang(me.preferred_language)
      })
      .catch(() => clearSession())
      .finally(() => setBooting(false))
  }, [clearSession, setLang])

  const login = useCallback(
    async (loginValue, password) => {
      const data = await authApi.login(loginValue, password)
      tokens.set(data)
      setUser(data.user)
      if (data.user.preferred_language) setLang(data.user.preferred_language)
      return data.user
    },
    [setLang],
  )

  const logout = useCallback(async () => {
    const refresh = tokens.refresh
    try {
      if (refresh) await authApi.logout(refresh)
    } catch {
      /* already logged out server-side */
    }
    clearSession()
  }, [clearSession])

  const updateUser = useCallback((data) => setUser((current) => ({ ...current, ...data })), [])

  const value = useMemo(
    () => ({
      user,
      booting,
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
      updateUser,
    }),
    [user, booting, login, logout, updateUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
