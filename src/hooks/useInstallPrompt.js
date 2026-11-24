import { useEffect, useState } from 'react'

/**
 * "Install app" support. Android/desktop Chrome fire `beforeinstallprompt`;
 * iOS Safari has no prompt, so we show "Share > Add to Home Screen" instructions.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  )

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      setDeferred(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  const install = async () => {
    if (!deferred) return false
    deferred.prompt()
    const choice = await deferred.userChoice
    setDeferred(null)
    return choice.outcome === 'accepted'
  }

  return { canInstall: Boolean(deferred), isIOS: isIOS && !installed, installed, install }
}
