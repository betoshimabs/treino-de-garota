import type { Exercise, Feeling, Workout, WorkoutItem } from './types'

type Focus = { key: string; label: string }

export type WorkoutTitleSuggestion = {
  title: string
  accessibleTitle: string
  usesEmoji: boolean
}

const playfulEmoji: Record<string, string> = {
  bracos: '💪',
  ciclismo: '🚲',
  corrida: '🏃‍♀️',
  gluteos: '🍑',
  mobilidade: '🧘‍♀️',
  natacao: '🏊‍♀️',
  pernas: '🦵',
}

const playfulSymbols = Object.values(playfulEmoji)

const capitalize = (value: string) => value ? `${value.charAt(0).toLocaleUpperCase('pt-BR')}${value.slice(1)}` : value

function hash(value: string) {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function pick<T>(values: T[], seed: string) {
  return values[hash(seed) % values.length]
}

function focusForExercise(item: WorkoutItem, exercise?: Exercise): Focus {
  const id = item.exerciseId.toLocaleLowerCase('pt-BR')
  if (/corrida/.test(id)) return { key: 'corrida', label: 'corrida' }
  if (/bicicleta|bike/.test(id)) return { key: 'ciclismo', label: 'ciclismo' }
  if (/natacao|natação/.test(id)) return { key: 'natacao', label: 'natação' }
  if (/yoga|pilates|mobilidade|alongamento/.test(id)) return { key: 'mobilidade', label: 'mobilidade' }
  if (item.category === 'cardio') return { key: 'cardio', label: 'cardio' }
  if (item.category === 'other') return { key: 'movimento', label: 'movimento' }

  const group = (exercise?.group ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const known: Record<string, Focus> = {
    bracos: { key: 'bracos', label: 'braços' },
    core: { key: 'core', label: 'core' },
    costas: { key: 'costas', label: 'costas' },
    gluteos: { key: 'gluteos', label: 'glúteos' },
    ombros: { key: 'ombros', label: 'ombros' },
    panturrilhas: { key: 'panturrilhas', label: 'panturrilhas' },
    peito: { key: 'peito', label: 'peito' },
    pernas: { key: 'pernas', label: 'pernas' },
    posterior: { key: 'posteriores', label: 'posteriores' },
  }
  return known[group] ?? { key: group || 'forca', label: exercise?.group.toLocaleLowerCase('pt-BR') || 'força' }
}

function combineFocus(items: WorkoutItem[], exercises: Exercise[]): Focus | undefined {
  if (items.length === 0) return undefined
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const counts = new Map<string, { focus: Focus; count: number }>()
  items.forEach((item) => {
    const focus = focusForExercise(item, exerciseById.get(item.exerciseId))
    const current = counts.get(focus.key)
    counts.set(focus.key, { focus, count: (current?.count ?? 0) + 1 })
  })
  const ranked = [...counts.values()].sort((left, right) => right.count - left.count || left.focus.label.localeCompare(right.focus.label, 'pt-BR'))
  const first = ranked[0]
  if (!ranked[1] || first.count / items.length >= 0.6) return first.focus

  const second = ranked[1]
  if ((first.count + second.count) / items.length < 0.75) return { key: 'corpo-todo', label: 'corpo todo' }
  const keys = new Set([first.focus.key, second.focus.key])
  if ([...keys].every((key) => ['cardio', 'ciclismo', 'corrida', 'natacao'].includes(key))) return { key: 'cardio', label: 'cardio' }

  const pairKey = [...keys].sort().join('+')
  const preferredPairs: Record<string, string> = {
    'costas+peito': 'costas e peito',
    'gluteos+pernas': 'pernas e glúteos',
    'gluteos+posteriores': 'glúteos e posteriores',
  }
  return { key: pairKey, label: preferredPairs[pairKey] ?? `${first.focus.label} e ${second.focus.label}` }
}

function dayCopy(day: number) {
  return [
    { lead: 'Domingo', connector: 'neste domingo' },
    { lead: 'Começando a semana', connector: 'para começar a semana' },
    { lead: 'Terça', connector: 'nesta terça' },
    { lead: 'Mantendo o ritmo', connector: 'no meio da semana' },
    { lead: 'Quinta', connector: 'nesta quinta' },
    { lead: 'Sextou', connector: 'para fechar a semana' },
    { lead: 'Sábado', connector: 'neste sábado' },
  ][day]
}

function feelingSuffix(feeling?: Feeling) {
  if (feeling === 'leve') return ' de leve'
  if (feeling === 'intenso') return ' com intensidade'
  return ''
}

export function titleHasPlayfulEmoji(title: string) {
  return playfulSymbols.some((emoji) => title.includes(emoji))
}

export function workoutTitleTextAlternative(title: string) {
  return Object.entries(playfulEmoji).reduce((result, [key, emoji]) => {
    const labels: Record<string, string> = { bracos: 'Braços', ciclismo: 'Ciclismo', corrida: 'Corrida', gluteos: 'Glúteos', mobilidade: 'Mobilidade', natacao: 'Natação', pernas: 'Pernas' }
    return result.replaceAll(emoji, labels[key])
  }, title)
}

export function isAutomaticWorkoutTitle(workout: Pick<Workout, 'title' | 'titleMode'>) {
  return workout.titleMode === 'auto' || (!workout.titleMode && workout.title === 'Treino de hoje')
}

export function createWorkoutTitleSuggestion({
  workoutId,
  startedAt,
  items,
  exercises,
  feeling,
  recentWorkoutTitles = [],
}: {
  workoutId: string
  startedAt: string
  items: WorkoutItem[]
  exercises: Exercise[]
  feeling?: Feeling
  recentWorkoutTitles?: string[]
}): WorkoutTitleSuggestion {
  const date = new Date(startedAt)
  const weekday = Number.isNaN(date.getTime()) ? 1 : date.getDay()
  const day = dayCopy(weekday)
  const focus = combineFocus(items, exercises)
  const suffix = feelingSuffix(feeling)

  if (!focus) {
    const title = feeling === 'leve' ? `${day.lead} de leve` : feeling === 'intenso' ? `${day.lead} com intensidade` : day.lead
    return { title, accessibleTitle: title, usesEmoji: false }
  }

  const signature = `${workoutId}:${focus.key}:${feeling ?? 'sem-sensacao'}:${items.map((item) => item.exerciseId).sort().join('|')}`
  const contextualClosing = feeling === 'leve'
    ? `${capitalize(focus.label)} de leve ${day.connector}`
    : feeling === 'intenso'
      ? `Treino intenso de ${focus.label} ${day.connector}`
      : `${capitalize(focus.label)} no ritmo de hoje`
  const textualCandidates = [
    weekday === 5
      ? `Sextou! ${capitalize(focus.label)}${suffix}.`
      : feeling === 'intenso'
        ? `${day.lead}: ${capitalize(focus.label)} com intensidade`
        : `${day.lead} com ${focus.label}${suffix}`,
    `${capitalize(focus.label)} ${day.connector}${suffix ? `,${suffix}` : ''}`,
    `Hoje teve ${focus.label}${suffix}`,
    contextualClosing,
  ]

  const emoji = playfulEmoji[focus.key]
  const emojiEligible = Boolean(emoji)
    && hash(`${workoutId}:emoji`) % 100 < 12
    && !recentWorkoutTitles.slice(0, 3).some(titleHasPlayfulEmoji)

  if (!emojiEligible || !emoji) {
    const title = pick(textualCandidates, `${signature}:texto`)
    return { title, accessibleTitle: title, usesEmoji: false }
  }

  const emojiCandidates = [
    weekday === 5 ? `Sextou! ${emoji}${suffix}.` : `${day.lead} com ${emoji}${suffix}`,
    `Hoje teve ${emoji}${suffix}`,
    `${emoji} ${day.connector}${suffix ? `,${suffix}` : ''}`,
  ]
  const title = pick(emojiCandidates, `${signature}:emoji-frase`)
  return { title, accessibleTitle: workoutTitleTextAlternative(title), usesEmoji: true }
}
