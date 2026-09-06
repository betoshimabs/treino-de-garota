import { describe, expect, it } from 'vitest'
import { adjustRest, closeRest, copySetForNextSeries, nextCreatedItem, recordGuidedSet, settleRests } from './workout-guide'
import type { Workout, WorkoutRest } from './types'

const workout: Workout = { id: 'w', title: 'Teste', status: 'active', startedAt: '2026-09-06T12:00:00Z', items: [
  { id: 'a', exerciseId: 'a', exerciseName: 'Corrida', category: 'cardio', metricMode: 'distance-time', sets: [{ id: 's', completed: false }] },
  { id: 'b', exerciseId: 'b', exerciseName: 'Agachamento', category: 'strength', metricMode: 'load-reps', sets: [] },
] }
const rest: WorkoutRest = { id: 'r', itemId: 'a', exerciseName: 'Corrida', startedAt: '2026-09-06T12:00:00Z', plannedSeconds: 90 }
describe('Guia de treino', () => {
  it('nova série copia valores, mas não conclusão, horário ou métricas antigas', () => {
    const copy = copySetForNextSeries({ id: 'previous', completed: true, completedAt: rest.startedAt, metrics: ['load', 'reps'], load: 15, reps: 12, distanceKm: 2, durationMinutes: 10 })
    expect(copy).toMatchObject({ completed: false, load: 15, reps: 12, distanceKm: 2, durationMinutes: 10 })
    expect(copy.id).not.toBe('previous')
    expect(copy.completedAt).toBeUndefined()
    expect(copy.metrics).toBeUndefined()
    expect(copySetForNextSeries().load).toBeUndefined()
  })
  it('concluir inicia 30 segundos de descanso vinculado à série sem duplicar', () => {
    const saved = recordGuidedSet({ ...workout, rests: [rest] }, 'a', { id: 's', completed: false, reps: 10 }, ['reps'], '2026-09-06T12:00:20Z')
    expect(saved.rests?.[0]).toMatchObject({ actualSeconds: 20, outcome: 'interrupted' })
    expect(saved.rests?.[1]).toMatchObject({ itemId: 'a', setId: 's', plannedSeconds: 30, startedAt: '2026-09-06T12:00:20Z' })
    expect(recordGuidedSet(saved, 'a', saved.items[0].sets[0], ['reps'], '2026-09-06T12:00:21Z')).toBe(saved)
  })
  it('ajusta o prazo sem reiniciar a pausa e preserva a escolha inicial', () => {
    const now = Date.parse(rest.startedAt) + 20_000
    const added = adjustRest({ ...workout, rests: [rest] }, rest.id, 15, now)
    expect(added.rests?.[0]).toMatchObject({ startedAt: rest.startedAt, plannedSeconds: 105, initialPlannedSeconds: 90, adjustments: [{ at: new Date(now).toISOString(), deltaSeconds: 15 }] })
    expect(adjustRest(added, rest.id, -15, now).rests?.[0].plannedSeconds).toBe(90)
  })
  it('encurta até zero sem apagar segundos já descansados', () => {
    const saved = adjustRest({ ...workout, rests: [rest] }, rest.id, -15, Date.parse(rest.startedAt) + 85_500)
    expect(saved.rests?.[0]).toMatchObject({ actualSeconds: 85, plannedSeconds: 85, outcome: 'completed' })
  })
  it('limita a três minutos restantes e não reabre pausas expiradas', () => {
    const now = Date.parse(rest.startedAt)
    const long = adjustRest({ ...workout, rests: [{ ...rest, plannedSeconds: 180 }] }, rest.id, 15, now)
    expect(long.rests?.[0].plannedSeconds).toBe(180)
    const expired = adjustRest({ ...workout, rests: [rest] }, rest.id, 15, now + 100_000)
    expect(expired.rests?.[0]).toMatchObject({ actualSeconds: 90, outcome: 'completed', plannedSeconds: 90 })
  })
  it('avança pela criação, sem separar cardio de musculação', () => {
    expect(nextCreatedItem(workout, 'a')?.id).toBe('b')
    expect(nextCreatedItem(workout, 'b')).toBeUndefined()
    expect(nextCreatedItem(workout, 'removido')).toBeUndefined()
  })
  it('recusa medidas incompletas e não altera a série original', () => {
    expect(() => recordGuidedSet(workout, 'a', { id: 's', completed: false, distanceKm: 2 }, ['distance', 'duration'], rest.startedAt)).toThrow()
    expect(workout.items[0].sets[0].completed).toBe(false)
  })
  it('salva métricas personalizadas, horário e apenas uma conclusão', () => {
    const saved = recordGuidedSet(workout, 'a', { id: 's', completed: false, durationMinutes: 10 }, ['duration'], rest.startedAt)
    expect(saved.items[0].sets[0]).toMatchObject({ completed: true, metrics: ['duration'], completedAt: rest.startedAt })
    expect(recordGuidedSet(saved, 'a', { id: 's', completed: false, durationMinutes: 15 }, ['duration'], rest.startedAt)).toBe(saved)
  })
  it('recusa conclusão em exercício removido', () => {
    expect(() => recordGuidedSet(workout, 'x', { id: 's', completed: false, reps: 10 }, ['reps'], rest.startedAt)).toThrow()
  })
  it('ao retornar após suspensão, limita o descanso ao prazo previsto', () => {
    const result = closeRest(rest, Date.parse(rest.startedAt) + 600_000)
    expect(result.actualSeconds).toBe(90)
    expect(result.endedAt).toBe('2026-09-06T12:01:30.000Z')
    expect(result.outcome).toBe('completed')
  })
  it('registra interrupção e não contabiliza segundos negativos', () => {
    expect(closeRest(rest, Date.parse(rest.startedAt) + 25_000)).toMatchObject({ actualSeconds: 25, outcome: 'interrupted' })
    expect(closeRest(rest, Date.parse(rest.startedAt) - 1000).actualSeconds).toBe(0)
  })
  it('finalizar interrompe descanso aberto, mas mantém histórico fechado', () => {
    const closed = closeRest(rest, Date.parse(rest.startedAt) + 30_000)
    const saved = settleRests({ ...workout, rests: [closed, { ...rest, id: 'r2' }] }, Date.parse(rest.startedAt) + 40_000, true)
    expect(saved.rests?.[0]).toBe(closed)
    expect(saved.rests?.[1].actualSeconds).toBe(40)
    expect(settleRests(workout, Date.now()).rests).toEqual([])
  })
})
