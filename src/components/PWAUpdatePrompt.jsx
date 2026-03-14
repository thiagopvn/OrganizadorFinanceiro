import { useRegisterSW } from 'virtual:pwa-register/react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

// Global ref so Dashboard can trigger a check
let swRegistrationRef = null
export const checkForUpdates = () => {
  if (swRegistrationRef) {
    swRegistrationRef.update()
    return true
  }
  return false
}

export const forceReload = () => {
  // Clear all caches and reload
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name))
    }).finally(() => {
      window.location.reload()
    })
  } else {
    window.location.reload()
  }
}

export default function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      swRegistrationRef = registration
      // Check for updates every 15 minutes
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 15 * 60 * 1000)
        // Also check immediately on registration
        registration.update()
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    }
  })

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {needRefresh && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-[9999] max-w-md mx-auto"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 relative overflow-hidden">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 to-brand-600" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3 pr-6">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Nova versao disponivel!
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Novas funcionalidades aguardam voce.
                </p>
              </div>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 gradient-brand text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:opacity-90 active:scale-[0.97] transition-all flex-shrink-0"
              >
                Atualizar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
