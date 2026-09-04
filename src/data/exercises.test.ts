import { describe, expect, it } from 'vitest'
import { exercises } from './exercises'

describe('catálogo curado de exercícios', () => {
  it('liga o protótipo visual e a fonte ao agachamento livre', () => {
    const exercise = exercises.find((item) => item.id === 'agachamento-livre')

    expect(exercise).toBeDefined()
    expect(exercise?.media?.posterSrc).toMatch(/exercise-media\/agachamento-livre\/poster\.webp$/)
    expect(exercise?.media?.motionSrc).toMatch(/exercise-media\/agachamento-livre\/movimento\.webp$/)
    expect(exercise?.curation).toMatchObject({
      primaryMuscles: ['Quadríceps'],
      movementPattern: 'Agachamento',
      stimulusToFatigue: 'moderado',
      reviewStatus: 'em-revisao',
      source: {
        name: 'ExerciseAPI',
        recordId: 'barbell_back_squat',
        license: 'CC BY 4.0',
      },
    })
  })

  it('liga a demonstração diagonal e a curadoria ao leg press', () => {
    const exercise = exercises.find((item) => item.id === 'leg-press')

    expect(exercise?.media?.posterSrc).toMatch(/exercise-media\/leg-press\/poster\.webp$/)
    expect(exercise?.media?.motionSrc).toMatch(/exercise-media\/leg-press\/movimento\.webp$/)
    expect(exercise?.curation).toMatchObject({
      primaryMuscles: ['Quadríceps'],
      movementPattern: 'Empurrar com as pernas',
      stimulusToFatigue: 'moderado',
      reviewStatus: 'em-revisao',
      source: {
        name: 'ExerciseAPI',
        recordId: 'leg_press',
        license: 'CC BY 4.0',
      },
    })
  })

  it('liga a demonstração diagonal e a curadoria ao stiff', () => {
    const exercise = exercises.find((item) => item.id === 'stiff')

    expect(exercise?.media?.posterSrc).toMatch(/exercise-media\/stiff\/poster\.webp$/)
    expect(exercise?.media?.motionSrc).toMatch(/exercise-media\/stiff\/movimento\.webp$/)
    expect(exercise?.curation).toMatchObject({
      primaryMuscles: ['Posteriores de coxa'],
      movementPattern: 'Dobradiça de quadril',
      reviewStatus: 'em-revisao',
      source: { recordId: 'romanian_deadlift' },
    })
  })

  it('mantém pôster, movimento e curadoria em todo o catálogo do sistema', () => {
    expect(exercises).toHaveLength(37)

    for (const exercise of exercises) {
      expect(exercise.media, `${exercise.id}: mídia`).toBeDefined()
      expect(exercise.curation, `${exercise.id}: curadoria`).toBeDefined()
      expect(exercise.curation?.reviewStatus, `${exercise.id}: revisão`).toBe('em-revisao')
      expect(exercise.curation?.primaryMuscles.length, `${exercise.id}: foco principal`).toBeGreaterThan(0)
      expect(exercise.curation?.movementPattern, `${exercise.id}: padrão de movimento`).toBeTruthy()
      expect(exercise.curation?.source.url, `${exercise.id}: fonte`).toMatch(/^https:\/\//)

      expect(exercise.media?.posterSrc, `${exercise.id}: poster.webp`).toMatch(
        new RegExp(`exercise-media/${exercise.id}/poster\\.webp$`),
      )
      expect(exercise.media?.motionSrc, `${exercise.id}: movimento.webp`).toMatch(
        new RegExp(`exercise-media/${exercise.id}/movimento\\.webp$`),
      )
    }
  })
})
