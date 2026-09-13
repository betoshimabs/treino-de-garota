import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => {
  const jobs = new Map<string, any>()
  const exercises = new Map<string, any>()
  const database = { customExercises: { add: vi.fn(async (e: any) => exercises.set(e.id, e)) }, manualOutbox: { add: vi.fn(async (e: any) => jobs.set(e.id, e)), where: () => ({ equals: (uid: string) => ({ toArray: async () => [...jobs.values()].filter(j => j.ownerUid === uid) }) }), update: vi.fn(async (id: string, patch: any) => { if (jobs.has(id)) Object.assign(jobs.get(id), patch) }), clear: vi.fn(async () => jobs.clear()) }, transaction: vi.fn(async (...args: any[]) => args.at(-1)()) }
  return { jobs, exercises, database, auth: { currentUser: { uid: 'author' } as { uid: string } | null, app: {} }, getDoc: vi.fn(), setDoc: vi.fn() }
})
vi.mock('./firebase', () => ({ auth: mock.auth }))
vi.mock('./db', () => ({ db: mock.database }))
vi.mock('firebase/firestore/lite', () => ({ getFirestore: () => ({}), doc: (...args: unknown[]) => args.slice(1).join('/'), getDoc: mock.getDoc, setDoc: mock.setDoc, serverTimestamp: () => 'SERVER_TIME' }))
import { createManualExercise, syncManualExercises } from './manual-exercises'
const draft = { name: 'Passada QA', equipment: '', group: 'Pernas', category: 'strength' as const, metricMode: 'load-reps' as const, description: '' }
beforeEach(() => { vi.clearAllMocks(); mock.jobs.clear(); mock.exercises.clear(); mock.auth.currentUser = { uid: 'author' }; vi.stubGlobal('navigator', { onLine: false }); vi.stubGlobal('window', { dispatchEvent: vi.fn() }); mock.getDoc.mockResolvedValue({ exists: () => false }); mock.setDoc.mockResolvedValue(undefined) })
describe('fila privada de exercícios', () => {
  it('salva offline e envia depois, sem duplicar na próxima sincronização', async () => {
    const e = await createManualExercise(draft)
    expect(mock.exercises.has(e.id)).toBe(true)
    expect(mock.setDoc).not.toHaveBeenCalled()
    vi.stubGlobal('navigator', { onLine: true })
    await syncManualExercises(); await syncManualExercises()
    expect(mock.setDoc).toHaveBeenCalledTimes(1)
    expect(mock.jobs.get(e.id).sent).toBe(true)
  })
  it('mantém fila em erro e recua o retry', async () => {
    const e = await createManualExercise(draft)
    vi.stubGlobal('navigator', { onLine: true }); mock.setDoc.mockRejectedValue(new Error('offline'))
    await syncManualExercises(); await syncManualExercises()
    expect(mock.setDoc).toHaveBeenCalledTimes(1)
    expect(mock.jobs.get(e.id).attempts).toBe(1)
    expect(mock.jobs.get(e.id).sent).toBeUndefined()
  })
  it('reconhece confirmação anterior após perda de conexão', async () => {
    const e = await createManualExercise(draft)
    vi.stubGlobal('navigator', { onLine: true }); mock.getDoc.mockResolvedValue({ exists: () => true })
    await syncManualExercises()
    expect(mock.setDoc).not.toHaveBeenCalled()
    expect(mock.jobs.get(e.id).sent).toBe(true)
  })
  it('não envia fila de outra conta', async () => {
    await createManualExercise(draft); mock.auth.currentUser = { uid: 'other' }
    vi.stubGlobal('navigator', { onLine: true }); await syncManualExercises()
    expect(mock.getDoc).not.toHaveBeenCalled()
  })
  it('interrompe antes de gravar se a conta muda durante a leitura', async () => {
    await createManualExercise(draft); vi.stubGlobal('navigator', { onLine: true })
    mock.getDoc.mockImplementation(async () => { mock.auth.currentUser = { uid: 'other' }; return { exists: () => false } })
    await syncManualExercises(); expect(mock.setDoc).not.toHaveBeenCalled()
  })
})
