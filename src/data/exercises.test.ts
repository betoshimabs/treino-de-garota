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
})
