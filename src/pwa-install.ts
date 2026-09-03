export const INSTALL_SNOOZE_KEY = 'tg-install-snoozed-until'
export const INSTALL_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000

export type InstallPlatform = 'ios' | 'android' | 'desktop'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let promptCaptureStarted = false
let capturedPrompt: BeforeInstallPromptEvent | undefined
const promptListeners = new Set<(event: BeforeInstallPromptEvent) => void>()

export function startInstallPromptCapture() {
  if (promptCaptureStarted || typeof window === 'undefined') return
  promptCaptureStarted = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    capturedPrompt = event as BeforeInstallPromptEvent
    promptListeners.forEach((listener) => listener(capturedPrompt as BeforeInstallPromptEvent))
  })
  window.addEventListener('appinstalled', () => { capturedPrompt = undefined })
}

export function subscribeToInstallPrompt(listener: (event: BeforeInstallPromptEvent) => void) {
  promptListeners.add(listener)
  if (capturedPrompt) listener(capturedPrompt)
  return () => { promptListeners.delete(listener) }
}

export function consumeCapturedInstallPrompt(event: BeforeInstallPromptEvent) {
  if (capturedPrompt === event) capturedPrompt = undefined
}

export function canShowInstallNudge(snoozedUntil: string | null, now = Date.now()) {
  const timestamp = Number(snoozedUntil ?? 0)
  return !Number.isFinite(timestamp) || now >= timestamp
}

export function getInstallPlatform(userAgent: string, platform = '', maxTouchPoints = 0): InstallPlatform {
  const ipadDesktopMode = /mac/i.test(platform) && maxTouchPoints > 1
  if (/iphone|ipad|ipod/i.test(userAgent) || ipadDesktopMode) return 'ios'
  if (/android/i.test(userAgent)) return 'android'
  return 'desktop'
}

export function getManualInstallSteps(platform: InstallPlatform) {
  if (platform === 'ios') {
    return [
      'Abra a Brabita no navegador.',
      'Toque em Compartilhar.',
      'Escolha “Adicionar à Tela de Início” e confirme.',
    ]
  }
  if (platform === 'android') {
    return [
      'Abra o menu do navegador (⋮).',
      'Toque em “Instalar app” ou “Adicionar à tela inicial”.',
      'Confirme a instalação da Brabita.',
    ]
  }
  return [
    'Abra o menu do navegador.',
    'Procure “Instalar Brabita” ou a seção de aplicativos.',
    'Confirme a instalação.',
  ]
}
