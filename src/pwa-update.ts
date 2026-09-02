import { registerSW } from 'virtual:pwa-register'
import {
  CURRENT_RELEASE,
  fetchLatestRelease,
  isPendingUpdateInstalled,
  readPendingUpdate,
  storePendingUpdate,
  type AppRelease,
} from './app-version'

let updateServiceWorker: (reloadPage?: boolean) => Promise<void> = async () => undefined
let registration: ServiceWorkerRegistration | undefined
let watchdog: number | undefined

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

async function activateWaitingWorker() {
  try {
    const currentRegistration = registration
      ?? await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    registration = currentRegistration
    if (!currentRegistration?.waiting) await currentRegistration?.update()
    await updateServiceWorker(true)
    startWatchdog()
  } catch {
    emit('tg:update-stalled', {
      message: 'Não conseguimos concluir a atualização. Seus dados continuam guardados neste aparelho.',
    })
  }
}

export async function applyAppUpdate(target?: AppRelease) {
  storePendingUpdate(target)
  emit('tg:update-applying', { target })
  await activateWaitingWorker()
}

export function registerAppServiceWorker() {
  updateServiceWorker = registerSW({
    immediate: true,
    async onNeedRefresh() {
      const latest = await fetchLatestRelease()
      const target = latest?.buildId === CURRENT_RELEASE.buildId ? undefined : latest
      const pending = readPendingUpdate()
      if (pending && !isPendingUpdateInstalled(pending)) {
        if (target && !pending.target) storePendingUpdate(target)
        await activateWaitingWorker()
        return
      }
      emit('tg:update-ready', { target })
    },
    onRegisteredSW(_serviceWorkerUrl, currentRegistration) {
      registration = currentRegistration
      const pending = readPendingUpdate()
      if (pending && !isPendingUpdateInstalled(pending)) void currentRegistration?.update()
    },
    onRegisterError() {
      if (readPendingUpdate()) {
        emit('tg:update-stalled', {
          message: 'Não conseguimos verificar a atualização agora. Tente novamente quando estiver online.',
        })
      }
    },
  })

  const pending = readPendingUpdate()
  if (pending && !isPendingUpdateInstalled(pending)) {
    window.setTimeout(() => void activateWaitingWorker(), 0)
  }
}
