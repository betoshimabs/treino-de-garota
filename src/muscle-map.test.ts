import { describe, expect, it } from 'vitest'
import { muscleMapping, regionRole } from './muscle-map'
import { exerciseCatalogDetails } from './data/exerciseCatalogDetails'

describe('Mapa de regiões musculares', () => {
  it('reconhece todos os termos do catálogo sem inventar músculos para capacidades', () => {
    for (const detail of Object.values(exerciseCatalogDetails)) {
      for (const name of [...(detail.curation?.primaryMuscles ?? []), ...(detail.curation?.secondaryMuscles ?? [])]) expect(muscleMapping(name), name).toBeDefined()
    }
    expect(muscleMapping('Sistema cardiorrespiratório')).toMatchObject({ regions: [], nonMuscular: true })
    expect(muscleMapping('Desconhecido')).toBeUndefined()
  })
  it('normaliza aliases sem misturar frente e costas dos braços', () => {
    expect(muscleMapping('  BICEPS  ')?.regions).toEqual(['biceps'])
    expect(muscleMapping('Tríceps')?.regions).toEqual(['triceps'])
  })
  it('prioriza alvo principal quando uma região possui papéis diferentes', () => {
    expect(regionRole('glutes', ['Glúteo máximo'], ['Glúteos'])).toBe('primary')
    expect(regionRole('hamstrings', ['Quadríceps'], ['Posteriores de coxa'])).toBe('secondary')
    expect(regionRole('chest', ['Quadríceps'], [])).toBe('neutral')
  })
  it('identifica simplificações e músculos profundos como região aproximada', () => {
    expect(muscleMapping('Transverso do abdome')?.approximate).toBe(true)
    expect(muscleMapping('Glúteo mínimo')?.approximate).toBe(true)
  })
})
