import { describe, expect, it } from 'vitest'
import { dayKey, exerciseSeries, periodDays, periodSummary, recordedRestSeconds, regionDistribution, selectPeriod } from './evolution'
import { exercises } from './data/exercises'
import type { Workout, WorkoutItem } from './types'

const squat = exercises.find(exercise => exercise.id === 'agachamento-livre')!
const item = (overrides: Partial<WorkoutItem> = {}): WorkoutItem => ({ id: 'item', exerciseId: squat.id, exerciseName: squat.name, analysis: structuredClone(squat.analysis), category: 'strength', metricMode: 'load-reps', sets: [{ id: 's', load: 20, reps: 8, completed: true }], ...overrides })
const workout = (overrides: Partial<Workout> = {}): Workout => ({ id: 'workout', title: 'Fixture de teste', startedAt: '2026-09-06T13:00:00Z', endedAt: '2026-09-06T14:00:00Z', timeZone: 'America/Sao_Paulo', status: 'completed', loadUnit: 'kg', items: [item()], ...overrides })

describe('Evolução — significado e integridade', () => {
  it('usa o dia de início no fuso salvo, sem deslocar treinos que atravessam meia-noite', () => {
    expect(dayKey('2026-09-06T01:00:00Z', 'America/Sao_Paulo')).toBe('2026-09-05')
    const late = workout({ startedAt: '2026-09-06T01:00:00Z', endedAt: '2026-09-06T04:00:00Z' })
    expect(selectPeriod([late], 1, new Date('2026-09-06T12:00:00')).length).toBe(0)
    expect(periodDays(28, new Date('2026-03-15T12:00:00')).length).toBe(28)
  })
  it('exclui ativos, sessões vazias e valores inválidos', () => {
    expect(selectPeriod([workout({ status: 'active' }), workout({ items: [] }), workout({ items: [item({ sets: [{ id: 'bad', load: Infinity, reps: 3, completed: true }] })] })], 28)).toHaveLength(0)
  })
  it('ordena instantes com offsets distintos e preserva a data local no gráfico', () => {
    const earlier = workout({ id: 'earlier', startedAt: '2026-09-06T01:30:00Z' })
    const later = workout({ id: 'later', startedAt: '2026-09-05T23:30:00-03:00' })
    const selected = selectPeriod([later, earlier], 28, new Date('2026-09-06T12:00:00'))
    expect(selected.map(row => row.id)).toEqual(['earlier', 'later'])
    expect(exerciseSeries(selected, squat.id, 'load', 'kg', 'total').points.map(row => row.localDay)).toEqual(['2026-09-05', '2026-09-05'])
  })
  it('separa séries de força, blocos de atividades e rascunhos', () => {
    const row = workout({ items: [item(), item({ id: 'cardio', category: 'cardio', metricMode: 'time-only', analysis: undefined, sets: [{ id: 'c', durationMinutes: 10, completed: true }, { id: 'draft', durationMinutes: 30, completed: false }] })] })
    expect(periodSummary([row])).toMatchObject({ sets: 1, activityRecords: 1, elapsedMinutes: 60, invalidRecords: 1, restSeconds: 0 })
  })
  it('une descansos sobrepostos e ignora os abertos, sem inferir tempo ativo', () => {
    const row = workout({ rests: [
      { id: '1', itemId: 'item', exerciseName: 'Teste', startedAt: '2026-09-06T13:00:00Z', endedAt: '2026-09-06T13:01:30Z', plannedSeconds: 90, actualSeconds: 90 },
      { id: '2', itemId: 'item', exerciseName: 'Teste', startedAt: '2026-09-06T13:01:00Z', endedAt: '2026-09-06T13:02:00Z', plannedSeconds: 90, actualSeconds: 60 },
      { id: '3', itemId: 'item', exerciseName: 'Teste', startedAt: '2026-09-06T13:59:00Z', plannedSeconds: 90 },
    ] })
    expect(recordedRestSeconds(row)).toBe(120)
  })
  it('converte apenas unidades confirmadas e não inventa convenção de carga para legados', () => {
    const row = workout({ loadUnit: 'lb', items: [item({ sets: [{ id: 's', completed: true, load: 22.0462262, reps: 8 }] })] })
    expect(exerciseSeries([row], squat.id, 'load', 'kg', 'total').points[0].value).toBeCloseTo(10, 1)
    expect(exerciseSeries([workout({ items: [item({ analysis: undefined })] })], squat.id, 'load', 'kg', 'total')).toMatchObject({ points: [], excluded: 1 })
    expect(exerciseSeries([workout({ loadUnit: undefined })], squat.id, 'load', 'kg', 'total')).toMatchObject({ points: [], excluded: 1 })
  })
  it('prefere unidade da série, sem mudar a unidade de séries antigas', () => {
    const row = workout({ loadUnit: undefined, items: [item({ sets: [{ id: 'old', completed: true, load: 200, reps: 8 }, { id: 'new', completed: true, load: 10, reps: 8, loadUnit: 'kg' }] })] })
    expect(exerciseSeries([row], squat.id, 'load', 'kg', 'total')).toMatchObject({ excluded: 1, points: [{ value: 10 }] })
  })
  it('assistência usa o menor valor, sem tratá-lo como resistência levantada', () => {
    const assisted = exercises.find(exercise => exercise.id === 'barra-fixa-assistida')!
    const row = workout({ items: [item({ exerciseId: assisted.id, analysis: assisted.analysis, sets: [{ id: '1', completed: true, load: 40, reps: 8 }, { id: '2', completed: true, load: 30, reps: 6 }] })] })
    expect(exerciseSeries([row], assisted.id, 'load', 'kg', 'assistance').points[0]).toMatchObject({ value: 30, description: '6 repetições nessa carga' })
  })
  it('ritmo é ponderado pela distância e ignora medidas desmarcadas', () => {
    const row = workout({ items: [item({ exerciseId: 'corrida-rua', category: 'cardio', metricMode: 'distance-time', sets: [
      { id: '1', completed: true, distanceKm: 1, durationMinutes: 5 }, { id: '2', completed: true, distanceKm: 3, durationMinutes: 18 }, { id: '3', completed: true, metrics: ['duration'], distanceKm: 100, durationMinutes: 1 },
    ] })] })
    expect(exerciseSeries([row], 'corrida-rua', 'pace', 'kg').points[0].value).toBe(5.75)
    expect(exerciseSeries([row], 'corrida-rua', 'distance', 'kg').points[0].value).toBe(4)
  })
  it('preserva snapshot muscular, separa participação e identifica inferência legada', () => {
    const saved = item(); saved.analysis!.primaryRegions = ['quads']; saved.analysis!.secondaryRegions = ['glutes']
    const result = regionDistribution([workout({ items: [saved, item({ id: 'legacy', analysis: undefined }), item({ id: 'yoga', category: 'other' })] })], exercises)
    expect(result.legacySets).toBe(1)
    expect(result.rows.find(row => row.id === 'quads')).toMatchObject({ direct: 2, supporting: 0 })
    expect(result.rows.find(row => row.id === 'glutes')).toMatchObject({ direct: 1, supporting: 1 })
    expect(saved.analysis!.primaryRegions).toEqual(['quads'])
  })
})
