import { useEffect } from 'react'
import { useAppStore } from '@renderer/state/store'
import { AlertIcon, CheckIcon } from './icons'

export function Toast(): JSX.Element | null {
  const toast = useAppStore((s) => s.toast)
  const dismissToast = useAppStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(dismissToast, 3200)
    return () => clearTimeout(timeout)
  }, [toast, dismissToast])

  if (!toast) return null

  const tone =
    toast.tone === 'error'
      ? 'border-red-300 bg-red-50 text-red-800'
      : toast.tone === 'success'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
        : 'border-neutral-300 bg-white text-black'

  return (
    <div className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${tone}`}>
      {toast.tone === 'error' ? <AlertIcon /> : <CheckIcon />}
      {toast.message}
    </div>
  )
}
