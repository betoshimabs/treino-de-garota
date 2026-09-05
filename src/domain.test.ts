import { describe, expect, it } from 'vitest'
import { calculateBmi, defaultMetricsForMode, isSetValid, isSetValidForMetrics, parseLocalizedNumber, workoutItemReadiness } from './domain'

describe('entradas localizadas', () => {
  it('aceita vírgula e ponto decimal', () => {
    expect(parseLocalizedNumber('12,5')).toBe(12.5)
    expect(parseLocalizedNumber('12.5')).toBe(12.5)
  })

  it('rejeita zero, negativos e texto', () => {
    expect(parseLocalizedNumber('0')).toBeUndefined()
    expect(parseLocalizedNumber('-2')).toBeUndefined()
    expect(parseLocalizedNumber('NaN')).toBeUndefined()
  })
})

describe('métricas orientadas à atividade', () => {
  it('exige carga e repetições na musculação', () => {
    expect(isSetValid({ id: '1', load: 20, reps: 10, completed: false }, 'load-reps')).toBe(true)
    expect(isSetValid({ id: '2', load: 20, completed: false }, 'load-reps')).toBe(false)
  })

  it('exige distância e tempo no cardio por distância', () => {
    expect(isSetValid({ id: '1', distanceKm: 3.2, durationMinutes: 25, completed: false }, 'distance-time')).toBe(true)
    expect(isSetValid({ id: '2', durationMinutes: 25, completed: false }, 'distance-time')).toBe(false)
  })

  it('permite combinar métricas personalizadas sem alterar a recomendação original', () => {
    expect(defaultMetricsForMode('load-reps')).toEqual(['load', 'reps'])
    expect(isSetValidForMetrics({ id: '1', reps: 12, durationMinutes: 2, completed: false }, ['reps', 'duration'])).toBe(true)
    expect(isSetValidForMetrics({ id: '2', reps: 12, completed: false }, ['reps', 'duration'])).toBe(false)
  })

  it('distingue valores faltando, prontos para confirmar e concluídos', () => {
    const base = { id: 'item', exerciseId: 'agachamento', exerciseName: 'Agachamento', category: 'strength' as const, metricMode: 'load-reps' as const, metrics: ['load', 'reps'] as const }
    expect(workoutItemReadiness({ ...base, metrics: [...base.metrics], sets: [{ id: '1', load: 20, completed: false }] })).toBe('missing-values')
    expect(workoutItemReadiness({ ...base, metrics: [...base.metrics], sets: [{ id: '1', load: 20, reps: 10, completed: false }] })).toBe('ready-to-confirm')
    expect(workoutItemReadiness({ ...base, metrics: [...base.metrics], sets: [{ id: '1', load: 20, reps: 10, completed: true }] })).toBe('complete')
  })
})

describe('IMC opcional', () => {
  it('calcula somente com peso e altura positivos', () => {
    expect(calculateBmi(60, 165)).toBe(22)
    expect(calculateBmi(undefined, 165)).toBeUndefined()
  })
})
