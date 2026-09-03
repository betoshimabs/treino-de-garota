import { describe, expect, it, vi } from 'vitest'
import { canShowInstallNudge, getInstallPlatform, getManualInstallSteps, startInstallPromptCapture, subscribeToInstallPrompt, type BeforeInstallPromptEvent } from './pwa-install'

describe('instalação da PWA', () => {
  it('respeita o adiamento de 24 horas sem ocultar estados inválidos para sempre', () => {
    expect(canShowInstallNudge('2000', 1000)).toBe(false)
    expect(canShowInstallNudge('2000', 2000)).toBe(true)
    expect(canShowInstallNudge('valor-antigo-inválido', 1000)).toBe(true)
  })

  it('distingue instruções de iOS, Android e desktop', () => {
    expect(getInstallPlatform('Mozilla/5.0 (iPhone)', 'iPhone', 5)).toBe('ios')
    expect(getInstallPlatform('Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l')).toBe('android')
    expect(getInstallPlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64')).toBe('desktop')
    expect(getInstallPlatform('Mozilla/5.0 (Macintosh)', 'MacIntel', 5)).toBe('ios')
    expect(getManualInstallSteps('ios')).toContain('Toque em Compartilhar.')
  })

  it('preserva o prompt emitido antes de a interface autenticada carregar', () => {
    const fakeWindow = new EventTarget()
    vi.stubGlobal('window', fakeWindow)
    startInstallPromptCapture()
    const prompt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => undefined,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }) as BeforeInstallPromptEvent
    fakeWindow.dispatchEvent(prompt)
    let received: BeforeInstallPromptEvent | undefined
    const unsubscribe = subscribeToInstallPrompt((event) => { received = event })
    expect(received).toBe(prompt)
    expect(prompt.defaultPrevented).toBe(true)
    unsubscribe()
    vi.unstubAllGlobals()
  })
})
