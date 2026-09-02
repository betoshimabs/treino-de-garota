import { registerSW } from 'virtual:pwa-register'
import {
  CURRENT_RELEASE,
  fetchLatestRelease,
  isPendingUpdateInstalled,
  readPendingUpdate,
  recordUpdateReloadAttempt,
  refinePendingUpdateTarget,
  storePendingUpdate,
  type AppRelease,
} from './app-version'

let registration: ServiceWorkerRegistration | undefined
let watchdog: number | undefined
let fallbackReload: number | undefined
let activatedUpdateReady = false

function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

function startWatchdog() {
  if (watchdog) window.clearTimeout(watchdog)
  watchdog = window.setTimeout(() => {
    emit('tg:update-stalled', {
      message: 'A nova versão ainda não assumiu o aplicativo. Verifique sua conexão e tente novamente.',
    })
  }, 15_000)
}

async function reloadIntoUpdatedApp() {
  recordUpdateReloadAttempt()
  startWatchdog()
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
  const url = new URL(window.location.href)
  url.searchParams.set('_tg_update', String(Date.now()))
  window.location.replace(url)
}

function scheduleFallbackReload() {
  if (fallbackReload) window.clearTimeout(fallbackReload)
  fallbackReload = window.setTimeout(() => {
    const pending = readPendingUpdate()
    if (pending && (pending.reloadAttempts ?? 0) < 2) void reloadIntoUpdatedApp()
  }, 1_500)
}

async function findRegistration() {
  registration ??= await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  return registration
}

export async function applyAppUpdate(target?: AppRelease) {
  storePendingUpdate(target)
  emit('tg:update-applying', { target })
  if (activatedUpdateReady) {
    await reloadIntoUpdatedApp()
    return
  }
  try {
    const currentRegistration = await findRegistration()
    if (currentRegistration?.waiting) {
      currentRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } else {
      await currentRegistration?.update()
    }
    startWatchdog()
    scheduleFallbackReload()
  } catch {
    emit('tg:update-stalled', {
      message: 'Não conseguimos concluir a atualização. Seus dados continuam guardados neste aparelho.',
    })
  }
}

export function registerAppServiceWorker() {
  registerSW({
    immediate: true,
    async onNeedReload() {
      activatedUpdateReady = true
      const latest = await fetchLatestRelease()
      const target = latest?.buildId === CURRENT_RELEASE.buildId ? undefined : latest
      const pending = readPendingUpdate()
      if (pending && !isPendingUpdateInstalled(pending)) {
        if (target && !pending.target) refinePendingUpdateTarget(target)
        emit('tg:update-applying', { target: target ?? pending.target })
        await reloadIntoUpdatedApp()
        return
      }
      emit('tg:update-ready', { target })
    },
    onRegisteredSW(_serviceWorkerUrl, currentRegistration) {
      registration = currentRegistration
      const pending = readPendingUpdate()
      if (pending && !isPendingUpdateInstalled(pending)) {
        startWatchdog()
        void currentRegistration?.update()
      }
    },
    onRegisterError() {
      if (readPendingUpdate()) {
        emit('tg:update-stalled', {
          message: 'Não conseguimos verificar a atualização agora. Tente novamente quando estiver online.',
        })
      }
    },
  })
}
