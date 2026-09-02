export type AppRelease = {
  version: string
  buildId: string
  builtAt: string
}

export type PendingUpdate = {
  target?: AppRelease
  fromBuildId: string
  startedAt: number
}

export type UpdateFlow = {
  phase: 'idle' | 'applying' | 'complete' | 'stalled'
  target?: AppRelease
  message?: string
}

export const CURRENT_RELEASE: AppRelease = {
  version: __APP_VERSION__,
  buildId: __APP_BUILD_ID__,
  builtAt: __APP_BUILT_AT__,
}

const PENDING_UPDATE_KEY = 'tg-pending-update'

export function readPendingUpdate(): PendingUpdate | undefined {
  try {
    const value = sessionStorage.getItem(PENDING_UPDATE_KEY)
    if (!value) return undefined
    const pending = JSON.parse(value) as Partial<PendingUpdate>
    if (typeof pending.fromBuildId !== 'string' || typeof pending.startedAt !== 'number') return undefined
    return pending as PendingUpdate
  } catch {
    return undefined
  }
}

export function storePendingUpdate(target?: AppRelease) {
  const pending: PendingUpdate = {
    target,
    fromBuildId: CURRENT_RELEASE.buildId,
    startedAt: Date.now(),
  }
  try {
    sessionStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(pending))
  } catch {
    // A atualização ainda pode ocorrer; a confirmação volta a usar a troca do build em memória.
  }
  return pending
}

export function isPendingUpdateInstalled(pending: PendingUpdate) {
  return pending.target?.buildId
    ? pending.target.buildId === CURRENT_RELEASE.buildId
    : pending.fromBuildId !== CURRENT_RELEASE.buildId
}

export function getInitialUpdateFlow(): UpdateFlow {
  const pending = readPendingUpdate()
  if (!pending) return { phase: 'idle' }
  if (!isPendingUpdateInstalled(pending)) return { phase: 'applying', target: pending.target }
  try {
    sessionStorage.removeItem(PENDING_UPDATE_KEY)
  } catch {
    // Nada a fazer: o build carregado já é o esperado.
  }
  return { phase: 'complete', target: CURRENT_RELEASE }
}

export async function fetchLatestRelease(): Promise<AppRelease | undefined> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return undefined
    const release = await response.json() as Partial<AppRelease>
    if (typeof release.version !== 'string' || typeof release.buildId !== 'string' || typeof release.builtAt !== 'string') return undefined
    return release as AppRelease
  } catch {
    return undefined
  }
}
