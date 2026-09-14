import type { PreloadApi } from '@shared/ipc/api'

declare global {
  interface Window {
    api: PreloadApi
  }
}

export {}
