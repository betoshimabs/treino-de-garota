import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, isPendingUpdateInstalled, type PendingUpdate } from './app-version'

const pending = (overrides: Partial<PendingUpdate> = {}): PendingUpdate => ({
  fromBuildId: 'build-anterior',
  startedAt: Date.now(),
  ...overrides,
})

describe('confirmação de atualização', () => {
  it('confirma quando o build carregado é exatamente o destino', () => {
    expect(isPendingUpdateInstalled(pending({
      target: { ...CURRENT_RELEASE },
    }))).toBe(true)
  })

  it('mantém a atualização bloqueada quando o destino ainda não foi carregado', () => {
    expect(isPendingUpdateInstalled(pending({
      target: { ...CURRENT_RELEASE, buildId: 'outro-build' },
    }))).toBe(false)
  })

  it('sem destino conhecido, confirma somente a troca do build anterior', () => {
    expect(isPendingUpdateInstalled(pending({ fromBuildId: CURRENT_RELEASE.buildId }))).toBe(false)
    expect(isPendingUpdateInstalled(pending({ fromBuildId: 'outro-build' }))).toBe(true)
  })
})
