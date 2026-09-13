import type { ActivityCategory, Exercise, MetricMode, WorkoutMetric } from './types'
import { defaultMetricsForMode, workoutMetricOrder } from './domain'

export const manualGroups = ['Peito', 'Costas', 'Ombros', 'Braços', 'Core', 'Glúteos', 'Pernas', 'Corpo inteiro'] as const
export interface ManualDraft { name: string; equipment: string; group: string; category: ActivityCategory; metricMode: MetricMode; description: string; defaultMetrics?: WorkoutMetric[] }
export interface ManualSubmission { id: string; ownerUid: string; exercise: ManualDraft; attempts: number; nextAttempt: number; sent?: boolean }
export function validateManualDraft(draft: ManualDraft) {
  if (draft.defaultMetrics !== undefined && (!Array.isArray(draft.defaultMetrics) || !draft.defaultMetrics.length || draft.defaultMetrics.length > 4 || new Set(draft.defaultMetrics).size !== draft.defaultMetrics.length || draft.defaultMetrics.some(metric => !workoutMetricOrder.includes(metric)))) return 'Selecione pelo menos um registro válido.'
  if (draft.name.trim().length < 2 || draft.name.trim().length > 100) return 'Use um nome entre 2 e 100 caracteres.'
  if (draft.equipment.trim().length > 100 || draft.description.trim().length > 600) return 'Encurte o equipamento ou a descrição.'
  if (!['strength', 'cardio', 'other'].includes(draft.category) || !['load-reps', 'reps-only', 'distance-time', 'time-only'].includes(draft.metricMode)) return 'Confira a modalidade e os registros.'
  if (![...manualGroups, 'Cardio', 'Outras'].includes(draft.group)) return 'Escolha uma região válida.'
  return ''
}
/** Explicit allowlist: never send workout snapshots, loads, profile or diary notes. */
export function cleanManualDraft(draft: ManualDraft): ManualDraft {
  const error = validateManualDraft(draft)
  if (error) throw new Error(error)
  return { name: draft.name.trim(), equipment: draft.equipment.trim() || 'Não informado', group: draft.group, category: draft.category, metricMode: draft.metricMode, description: draft.description.trim(), ...(draft.defaultMetrics ? { defaultMetrics: workoutMetricOrder.filter(metric => draft.defaultMetrics!.includes(metric)) } : {}) }
}
export function manualExercise(id: string, draft: ManualDraft): Exercise {
  const clean = cleanManualDraft(draft)
  return { id, name: clean.name, equipment: clean.equipment, group: clean.group, category: clean.category, metricMode: clean.metricMode, defaultMetrics: clean.defaultMetrics ?? defaultMetricsForMode(clean.metricMode), instructions: clean.description ? [clean.description] : [], aliases: [], origin: 'custom', visual: clean.category === 'strength' ? 'flow' : 'walk' }
}
