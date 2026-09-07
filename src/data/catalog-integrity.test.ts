import { describe, expect, it } from 'vitest'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { exercises } from './exercises'
import { systemTemplates } from './templates'
import { muscleMapping } from '../muscle-map'

describe('integridade editorial e de mídia', () => {
  it('preserva identidades antigas e diferencia variantes', () => {
    expect(exercises.find(row => row.id === 'stiff')?.name).toBe('Terra romeno com barra')
    expect(exercises.find(row => row.id === 'agachamento-livre')?.aliases).toContain('Agachamento livre')
    expect(exercises.find(row => row.id === 'barra-fixa-assistida')?.analysis?.loadConvention).toBe('assistance')
    expect(exercises.find(row => row.id === 'supino-halteres')?.analysis?.loadConvention).toBe('per-implement')
  })
  it('não deixa modelos órfãos ou duplicados e cobre níveis e focos', () => {
    expect(systemTemplates).toHaveLength(12)
    expect(new Set(systemTemplates.map(row => row.id)).size).toBe(12)
    expect(new Set(systemTemplates.map(row => row.level))).toEqual(new Set(['Iniciante', 'Intermediário', 'Avançado']))
    for (const model of systemTemplates) {
      expect(model.intention).toBeTruthy()
      expect(model.preparation).toBeTruthy()
      expect(new Set(model.exerciseIds).size).toBe(model.exerciseIds.length)
      for (const id of model.exerciseIds) expect(exercises.some(row => row.id === id), `${model.id}/${id}`).toBe(true)
    }
    for (const id of ['template-pernas-base', 'template-superiores', 'template-misto-leve', 'template-gluteos-posterior']) expect(systemTemplates.some(row => row.id === id)).toBe(true)
  })
  it('mapa da ficha e mapa analítico têm a mesma fonte', () => {
    for (const exercise of exercises) {
      const primary = [...new Set(exercise.curation!.primaryMuscles.flatMap(name => muscleMapping(name)?.regions ?? []))]
      expect(exercise.analysis!.primaryRegions, exercise.id).toEqual(primary)
      expect(exercise.analysis!.secondaryRegions.some(region => primary.some(id => id === region))).toBe(false)
      if (exercise.category === 'strength') expect(primary.length, exercise.id).toBeGreaterThan(0)
    }
  })
  it('mantém 50 pares reais, transparência, três quadros e limites de bytes', async () => {
    for (const exercise of exercises) {
      const directory = resolve('public/exercise-media', exercise.id)
      const poster = resolve(directory, 'poster.webp'); const motion = resolve(directory, 'movimento.webp')
      const meta = await sharp(motion, { animated: true }).metadata()
      expect(meta.width, exercise.id).toBe(768)
      expect(meta.pageHeight, exercise.id).toBe(512)
      expect(meta.pages, exercise.id).toBe(3)
      expect(meta.hasAlpha, exercise.id).toBe(true)
      expect(statSync(poster).size, exercise.id).toBeLessThanOrEqual(100000)
      expect(statSync(motion).size, exercise.id).toBeLessThanOrEqual(650000)
    }
  })
})
