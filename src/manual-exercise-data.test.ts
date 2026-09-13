import { describe, expect, it } from 'vitest'
import { cleanManualDraft, manualExercise, validateManualDraft, type ManualDraft } from './manual-exercise-data'
const draft: ManualDraft = { name: ' Passada no step ', equipment: '', group: 'Pernas', category: 'strength', metricMode: 'load-reps', description: '' }
describe('cadastros manuais', () => {
  it('preserva qualquer combinação individual como padrão', () => {
    expect(manualExercise('custom-qa', { ...draft, defaultMetrics: ['duration', 'load'] }).defaultMetrics).toEqual(['load', 'duration'])
    expect(validateManualDraft({ ...draft, defaultMetrics: [] })).not.toBe('')
    expect(validateManualDraft({ ...draft, defaultMetrics: ['load', 'load'] })).not.toBe('')
  })
  it('limpa campos sem copiar informações privadas extras', () => {
    const result = cleanManualDraft({ ...draft, workout: { load: 30 }, profile: { nickname: 'QA' } } as ManualDraft)
    expect(Object.keys(result).sort()).toEqual(['category', 'description', 'equipment', 'group', 'metricMode', 'name'])
    expect(result.name).toBe('Passada no step')
    expect(result.equipment).toBe('Não informado')
  })
  it('não inventa validação, músculos ou instruções ausentes', () => {
    const result = manualExercise('custom-qa', draft)
    expect(result.origin).toBe('custom')
    expect(result.analysis).toBeUndefined()
    expect(result.curation).toBeUndefined()
    expect(result.instructions).toEqual([])
  })
  it.each([{ name: ' ' }, { name: 'x'.repeat(101) }, { equipment: 'x'.repeat(101) }, { description: 'x'.repeat(601) }, { group: 'inventado' }])('rejeita entrada inválida %j', invalid => {
    expect(validateManualDraft({ ...draft, ...invalid })).not.toBe('')
  })
})
