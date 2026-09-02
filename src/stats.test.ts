import { describe, expect, it } from 'vitest'
import { exerciseProgress, thisMonthCount, totalCompletedSets } from './stats'
import type { Workout } from './types'

const workout: Workout = {
  id: 'w1',
  title: 'Treino de pernas',
  status: 'completed',
  startedAt: '2026-09-02T10:00:00.000Z',
  endedAt: '2026-09-02T11:00:00.000Z',
  items: [{
    id: 'i1',
    exerciseId: 'agachamento-livre',
    exerciseName: 'Agachamento livre',
    category: 'strength',
    metricMode: 'load-reps',
    sets: [
      { id: 's1', load: 20, reps: 10, completed: true },
      { id: 's2', load: 25, reps: 8, completed: true },
      { id: 's3', load: 30, reps: 6, completed: false },
    ],
  }],
}

describe('estatísticas locais', () => {
  it('conta apenas séries concluídas', () => expect(totalCompletedSets([workout])).toBe(2))
  it('conta treinos no mês escolhido', () => expect(thisMonthCount([workout], new Date('2026-09-15'))).toBe(1))
  it('usa a maior carga concluída por sessão', () => expect(exerciseProgress([workout], 'agachamento-livre')[0]?.value).toBe(25))
})
