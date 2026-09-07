import { describe, expect, it } from 'vitest'
import { effortCalendar, effortCells, executionRanking, extrema, metricHighlights, metricRecords, muscleShares, periodWindow, weeklyFrequency, workoutsInDays } from './evolution'
import { exercises } from './data/exercises'
import { canonicalRegions, macroGroups, muscleGroups } from './muscle-taxonomy'
import { frontPatches, backPatches } from './components/muscle-geometry'
import type { Workout, WorkoutItem } from './types'

const exercise = exercises.find(e => e.id === 'agachamento-livre')!
const item = (overrides: Partial<WorkoutItem> = {}): WorkoutItem => ({ id: 'i', exerciseId: exercise.id, exerciseName: exercise.name, category: 'strength', metricMode: 'load-reps', analysis: structuredClone(exercise.analysis), sets: [{ id: 's', completed: true, load: 20, reps: 10 }], ...overrides })
const workout = (overrides: Partial<Workout> = {}): Workout => ({ id: 'w', title: 'Fixture', status: 'completed', startedAt: '2026-09-07T12:00:00Z', loadUnit: 'kg', timeZone: 'America/Sao_Paulo', items: [item()], ...overrides })
describe('Evolução revisada', () => {
  it('agrega células conforme o período e pondera pelas respostas, não pelas médias dos dias', () => {
    const daily = effortCalendar([workout({ feeling: 'leve' }), workout({ id: '2', feeling: 'leve' }), workout({ id: '3', startedAt: '2026-09-08T12:00:00Z', feeling: 'intenso' })], ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'])
    const cells = effortCells(daily, '12w')
    expect(cells).toHaveLength(2)
    expect(cells[0]).toMatchObject({ date: '2026-09-07', end: '2026-09-09', days: 3, marked: 3, sessions: 3 })
    expect(cells[0].average).toBeCloseTo(5 / 3)
    expect(cells[1]).toMatchObject({ days: 1, marked: 0, level: 0 })
    for (const period of ['4w', '12w', '6m', '12m'] as const) {
      const days = periodWindow(period, new Date('2026-09-07T12:00:00')).days
      const result = effortCells(effortCalendar([], days), period)
      expect(result.length).toBeGreaterThanOrEqual(26)
      expect(result.length).toBeLessThanOrEqual(28)
      expect(result.flatMap(c => c.days).reduce((a, b) => a + b, 0)).toBe(days.length)
      expect(result.at(-1)!.end).toBe(days.at(-1))
    }
  })
  it('oferece semanas exatas e meses civis, incluindo ano bissexto', () => {
    const now = new Date('2026-09-07T12:00:00')
    expect(periodWindow('4w', now).days).toHaveLength(28)
    expect(periodWindow('12w', now).days).toHaveLength(84)
    expect(periodWindow('6m', now).days[0]).toBe('2026-03-08')
    expect(periodWindow('12m', new Date('2024-03-01T12:00:00')).days).toHaveLength(366)
    expect(periodWindow('6m', new Date('2026-08-31T12:00:00')).days[0]).toBe('2026-03-01')
    const window = periodWindow('6m', now)
    expect(window.previousDays.length).toBe(window.days.length)
    expect(window.previousDays.at(-1)).toBe('2026-03-07')
    expect(window.previousDays.some(d => window.days.includes(d))).toBe(false)
  })
  it('inclui apenas sessões válidas e distribui zeros reais em semanas', () => {
    const days = periodWindow('4w', new Date('2026-09-07T12:00:00')).days
    const selected = workoutsInDays([workout(), workout({ id: 'active', status: 'active' }), workout({ id: 'empty', items: [] })], days)
    expect(selected).toHaveLength(1)
    expect(weeklyFrequency(selected, days).map(w => w.value)).toEqual([0, 0, 0, 1])
  })
  it('desempata máximo e mínimo pela primeira ocorrência', () => {
    expect(extrema([2, 5, 1, 5, 1].map(value => ({ value })))).toEqual({ min: 2, max: 1 })
    expect(extrema([{ value: 3 }])).toEqual({ min: 0, max: 0 })
    expect(extrema([])).toBeUndefined()
  })
  it('conta execuções por sessão, não por série ou item duplicado', () => {
    const other = item({ exerciseId: 'cadeira-flexora', exerciseName: 'Flexora' })
    const ranking = executionRanking([workout({ items: [item(), item({ id: 'duplicado' }), other] }), workout({ id: '2', items: [other] })], exercises)
    expect(ranking.map(r => [r.id, r.count])).toEqual([['cadeira-flexora', 2], [exercise.id, 1]])
  })
  it('médias usam cada linha e ignoram rascunhos e campos desmarcados', () => {
    const w = workout({ items: [item({ sets: [{ id: 'a', completed: true, load: 10, reps: 8 }, { id: 'b', completed: true, load: 30, reps: 12 }, { id: 'c', completed: false, load: 200, reps: 10 }, { id: 'd', completed: true, metrics: ['reps'], load: 100, reps: 20 }] })] })
    const result = metricHighlights([w], [w], 'kg')
    expect(result[0]).toMatchObject({ count: 2, average: 20, maximum: { value: 30, setId: 'b' }, personalRecord: true })
    expect(result[1]).toMatchObject({ count: 3, maximum: { value: 20 } })
    expect(result[2].average).toBeUndefined()
  })
  it('recorde é por exercício e convenção, empates não ganham novo selo; excluir recalcula', () => {
    const old = workout({ id: 'old', startedAt: '2026-08-01T12:00:00Z' })
    const current = workout()
    expect(metricHighlights([current], [current, old], 'kg')[0].personalRecord).toBe(false)
    expect(metricHighlights([current], [current], 'kg')[0].personalRecord).toBe(true)
    const stronger = workout({ id: 'other', items: [item({ exerciseId: 'outro', sets: [{ id: 's', completed: true, load: 100, reps: 10 }] })] })
    expect(metricHighlights([current], [current, stronger], 'kg')[0].personalRecord).toBe(true)
  })
  it('converte unidades conhecidas; não agrega assistência nem unidade desconhecida', () => {
    const lb = workout({ loadUnit: 'lb', items: [item({ sets: [{ id: 's', completed: true, load: 22.0462262, reps: 8 }] })] })
    expect(metricRecords([lb], 'load', 'kg')[0].value).toBe(10)
    const assisted = item(); assisted.analysis!.loadConvention = 'assistance'
    expect(metricRecords([workout({ items: [assisted] }), workout({ loadUnit: undefined })], 'load', 'kg')).toEqual([])
  })
  it('não reescreve snapshots e não duplica regiões antigas unificadas', () => {
    expect(canonicalRegions(['lats', 'upperBack', 'obliques', 'abs', 'hips'])).toEqual(['back', 'abs', 'abductors'])
    const legacy = item(); legacy.analysis!.primaryRegions = ['lats', 'upperBack']; legacy.analysis!.secondaryRegions = ['upperBack', 'biceps']
    const result = muscleShares([workout({ items: [legacy] })], exercises, true)
    expect(result.groups.find(r => r.id === 'back')).toMatchObject({ direct: 1, supporting: 0, percent: 50 })
    expect(result.macros.find(r => r.id === 'arms')?.percent).toBe(50)
    expect(result.macros.reduce((sum, r) => sum + r.percent, 0)).toBeCloseTo(100)
    expect(legacy.analysis!.primaryRegions).toEqual(['lats', 'upperBack'])
  })
  it('calendário faz média apenas das percepções presentes e distingue ausência de intensidade', () => {
    const result = effortCalendar([workout({ feeling: 'leve' }), workout({ id: '2', feeling: 'intenso' }), workout({ id: '3' })], ['2026-09-06', '2026-09-07'])
    expect(result[0]).toMatchObject({ level: 0, sessions: 0, average: undefined })
    expect(result[1]).toMatchObject({ level: 2, sessions: 3, marked: 2, average: 2 })
    expect(effortCalendar([workout()], ['2026-09-07'])[0]).toMatchObject({ sessions: 1, marked: 0, level: 0 })
  })
  it('taxonomia completa cobre cada grupo uma vez e os 50 itens e paths usam a mesma base', () => {
    expect(Object.keys(muscleGroups)).toHaveLength(14)
    const assigned = macroGroups.flatMap(m => [...m.groups])
    expect(new Set(assigned).size).toBe(14)
    expect(exercises).toHaveLength(50)
    for (const e of exercises) {
      expect(e.analysis?.version).toBe('2026-09-07.1')
      for (const id of [...e.analysis!.primaryRegions, ...e.analysis!.secondaryRegions]) expect(id in muscleGroups, e.id).toBe(true)
      for (const name of [...e.curation!.primaryMuscles, ...e.curation!.secondaryMuscles]) expect(Object.values(muscleGroups)).toContain(name)
      if (e.analysis!.kind === 'session') expect(e.analysis!.primaryRegions).toHaveLength(0)
    }
    expect(new Set([...frontPatches, ...backPatches].map(p => p.region))).toEqual(new Set(Object.keys(muscleGroups)))
    expect(exercises.find(e => e.id === 'cadeira-abdutora')?.curation?.primaryMuscles).toEqual(['Abdutores'])
  })
})
