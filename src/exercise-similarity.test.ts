import { describe, expect, it } from 'vitest'
import { similarExercises } from './exercise-similarity'
import { exercises } from './data/exercises'
describe('sugestões locais de exercícios', () => {
  it('prioriza o nome exato sem depender de acentos ou caixa', () => {
    expect(similarExercises('CADEIRA EXTENSORA', exercises)[0].id).toBe('cadeira-extensora')
    expect(similarExercises('Elevacao pelvica com barra', exercises)[0].id).toBe('elevacao-pelvica')
  })
  it('encontra aliases e pequenos erros de digitação', () => {
    expect(similarExercises('stiff', exercises).some(e => e.id === 'stiff')).toBe(true)
    expect(similarExercises('cadeira extensra', exercises)[0].id).toBe('cadeira-extensora')
  })
  it('não sugere para vazio, palavras de ligação ou termos sem relação', () => {
    for (const query of ['', 'a', 'com', 'xyz inexistente']) expect(similarExercises(query, exercises)).toEqual([])
  })
  it('limita candidatos sem tratar variantes como identidade', () => {
    expect(similarExercises('supino', exercises).length).toBeLessThanOrEqual(3)
  })
})
