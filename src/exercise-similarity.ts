import type { Exercise } from './types'
export const normalizeExerciseName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
const words = (name: string) => normalizeExerciseName(name).split(' ').filter(word => word.length > 1 && !['de', 'da', 'do', 'na', 'no', 'com', 'em'].includes(word))
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    row = next
  }
  return row[b.length]
}
export function similarExercises(query: string, exercises: Exercise[]): Exercise[] {
  const normalized = normalizeExerciseName(query).slice(0, 100)
  if (normalized.length < 3) return []
  const tokens = words(normalized)
  if (!tokens.length) return []
  return exercises.map(exercise => {
    const score = Math.max(...[exercise.name, ...exercise.aliases].map(name => {
      const candidate = normalizeExerciseName(name)
      if (candidate === normalized) return 1
      const candidateWords = words(candidate)
      const matched = tokens.filter(token => candidateWords.some(word => word === token || (token.length >= 4 && word.startsWith(token)) || (token.length >= 5 && distance(token, word) <= 1))).length / tokens.length
      const spelling = 1 - distance(normalized, candidate) / Math.max(normalized.length, candidate.length)
      return Math.max(matched >= .75 ? .8 + .1 * tokens.length / Math.max(tokens.length, candidateWords.length) : 0, spelling >= .82 ? spelling : 0)
    }))
    return { exercise, score }
  }).filter(row => row.score >= .8).sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'pt-BR')).slice(0, 3).map(row => row.exercise)
}
