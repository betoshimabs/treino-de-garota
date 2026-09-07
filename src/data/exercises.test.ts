import { describe, expect, it } from 'vitest'
import { exercises } from './exercises'

describe('catálogo curado de exercícios', () => {
  it('liga o protótipo visual e a fonte ao agachamento livre', () => {
    const exercise = exercises.find((item) => item.id === 'agachamento-livre')

    expect(exercise).toBeDefined()
    expect(exercise?.media?.posterSrc).toMatch(/exercise-media\/agachamento-livre\/poster\.webp$/)
    expect(exercise?.media?.motionSrc).toMatch(/exercise-media\/agachamento-livre\/movimento\.webp$/)
    expect(exercise?.curation).toMatchObject({
      primaryMuscles: ['Quadríceps', 'Glúteos'],
      movementPattern: 'Agachamento',
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
      primaryMuscles: ['Quadríceps', 'Glúteos'],
      movementPattern: 'Empurrar com as pernas',
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
      primaryMuscles: ['Posteriores', 'Glúteos'],
      movementPattern: 'Dobradiça de quadril',
      reviewStatus: 'em-revisao',
      source: { recordId: 'romanian_deadlift' },
    })
  })

  it('mantém pôster, movimento e curadoria em todo o catálogo do sistema', () => {
    expect(exercises).toHaveLength(50)
    expect(new Set(exercises.map(exercise => exercise.id)).size).toBe(50)

    for (const exercise of exercises) {
      expect(exercise.media, `${exercise.id}: mídia`).toBeDefined()
      expect(exercise.curation, `${exercise.id}: curadoria`).toBeDefined()
      expect(exercise.curation?.reviewStatus, `${exercise.id}: revisão`).toBe('em-revisao')
      if (exercise.analysis?.kind === 'movement') expect(exercise.curation?.primaryMuscles.length, `${exercise.id}: foco principal`).toBeGreaterThan(0)
      else expect(exercise.curation?.primaryMuscles, `${exercise.id}: sessão ampla não inventa músculos`).toEqual([])
      expect(exercise.analysis?.version, `${exercise.id}: versão`).toBeTruthy()
      expect(exercise.editorial?.setup, `${exercise.id}: preparação`).toBeTruthy()
      expect(exercise.editorial?.care, `${exercise.id}: cuidados`).toBeTruthy()
      expect(exercise.editorial?.references.length, `${exercise.id}: fontes complementares`).toBeGreaterThan(0)
      expect(exercise.curation?.stimulusToFatigue).toBeUndefined()
      expect(exercise.curation?.suggestedRepRange).toBeUndefined()
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
