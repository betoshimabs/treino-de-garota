import { describe, expect, it } from 'vitest'
import type { Exercise, WorkoutItem } from './types'
import { createWorkoutTitleSuggestion, isAutomaticWorkoutTitle, titleHasPlayfulEmoji } from './workout-title'

const exercise = (id: string, group: string, category: Exercise['category'] = 'strength'): Exercise => ({
  id, name: id, aliases: [], group, equipment: 'Teste', instructions: [], origin: 'system', category, metricMode: category === 'strength' ? 'load-reps' : 'time-only', visual: 'flow',
})
const item = (id: string, category: WorkoutItem['category'] = 'strength'): WorkoutItem => ({
  id, exerciseId: id, exerciseName: id, category, metricMode: category === 'strength' ? 'load-reps' : 'time-only', sets: [{ id: `${id}-1`, completed: false }],
})

describe('títulos sugeridos para o treino', () => {
  it('muda de forma estável quando o foco ou a sensação mudam', () => {
    const base = { workoutId: 'sessao-estavel', startedAt: '2026-09-04T15:00:00-03:00', exercises: [exercise('stiff', 'Posterior'), exercise('remada', 'Costas')] }
    const posterior = createWorkoutTitleSuggestion({ ...base, items: [item('stiff')] })
    const repeated = createWorkoutTitleSuggestion({ ...base, items: [item('stiff')] })
    const costas = createWorkoutTitleSuggestion({ ...base, items: [item('remada')] })
    const leve = createWorkoutTitleSuggestion({ ...base, items: [item('stiff')], feeling: 'leve' })
    expect(repeated).toEqual(posterior)
    expect(costas.title).not.toBe(posterior.title)
    expect(leve.title).not.toBe(posterior.title)
  })

  it('combina dia, foco e intensidade sem repetir conectivos', () => {
    const suggestion = createWorkoutTitleSuggestion({ workoutId: 'quinta-gluteos', startedAt: '2026-09-03T10:00:00-03:00', items: [item('elevacao')], exercises: [exercise('elevacao', 'Glúteos')], feeling: 'intenso' })
    expect(suggestion.title).not.toMatch(/com glúteos com/i)
    expect(suggestion.title).toMatch(/glúteos/i)
    expect(suggestion.title).toMatch(/quinta|intensidade|intenso/i)
  })

  it('usa no máximo um emoji e preserva um título acessível', () => {
    const exercises = [exercise('corrida-rua', 'Cardio', 'cardio')]
    let suggestion
    for (let index = 0; index < 200; index += 1) {
      suggestion = createWorkoutTitleSuggestion({ workoutId: `corrida-${index}`, startedAt: '2026-09-04T15:00:00-03:00', items: [item('corrida-rua', 'cardio')], exercises })
      if (suggestion.usesEmoji) break
    }
    expect(suggestion?.usesEmoji).toBe(true)
    expect(titleHasPlayfulEmoji(suggestion?.title ?? '')).toBe(true)
    expect(titleHasPlayfulEmoji(suggestion?.accessibleTitle ?? '')).toBe(false)
    expect(suggestion?.accessibleTitle).toMatch(/Corrida/i)
  })

  it('aplica um intervalo de três registros depois de um título com emoji', () => {
    const exercises = [exercise('corrida-rua', 'Cardio', 'cardio')]
    let eligibleId = ''
    for (let index = 0; index < 200; index += 1) {
      const candidate = createWorkoutTitleSuggestion({ workoutId: `intervalo-${index}`, startedAt: '2026-09-04T15:00:00-03:00', items: [item('corrida-rua', 'cardio')], exercises })
      if (candidate.usesEmoji) { eligibleId = `intervalo-${index}`; break }
    }
    const blocked = createWorkoutTitleSuggestion({ workoutId: eligibleId, startedAt: '2026-09-04T15:00:00-03:00', items: [item('corrida-rua', 'cardio')], exercises, recentWorkoutTitles: ['Treino comum', 'Hoje teve 🍑', 'Outro treino'] })
    expect(blocked.usesEmoji).toBe(false)
  })

  it('preserva títulos antigos e reconhece apenas o padrão legado como automático', () => {
    expect(isAutomaticWorkoutTitle({ title: 'Treino de hoje' })).toBe(true)
    expect(isAutomaticWorkoutTitle({ title: 'Meu treino' })).toBe(false)
    expect(isAutomaticWorkoutTitle({ title: 'Qualquer texto', titleMode: 'auto' })).toBe(true)
  })
})
