import type { MetricMode, WorkoutItem, WorkoutMetric, WorkoutSet } from './types'

export const workoutMetricOrder: WorkoutMetric[] = ['load', 'reps', 'distance', 'duration']

export function defaultMetricsForMode(metricMode: MetricMode): WorkoutMetric[] {
  if (metricMode === 'load-reps') return ['load', 'reps']
  if (metricMode === 'reps-only') return ['reps']
  if (metricMode === 'distance-time') return ['distance', 'duration']
  return ['duration']
}

export function parseLocalizedNumber(raw: string): number | undefined {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized)) return undefined
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export function formatLocalizedNumber(value?: number): string {
  if (value === undefined) return ''
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

export function isSetValid(set: WorkoutSet, metricMode: MetricMode): boolean {
  return isSetValidForMetrics(set, defaultMetricsForMode(metricMode))
}

export function isSetValidForMetrics(set: WorkoutSet, metrics: WorkoutMetric[]): boolean {
  return metrics.length > 0 && metrics.every((metric) => {
    if (metric === 'load') return positive(set.load)
    if (metric === 'reps') return positive(set.reps)
    if (metric === 'distance') return positive(set.distanceKm)
    return positive(set.durationMinutes)
  })
}

export type WorkoutItemReadiness = 'missing-values' | 'ready-to-confirm' | 'complete'

export function workoutItemReadiness(item: WorkoutItem): WorkoutItemReadiness {
  if (item.sets.length === 0) return 'missing-values'
  const metrics = item.metrics ?? defaultMetricsForMode(item.metricMode)
  if (!item.sets.every((set) => isSetValidForMetrics(set, metrics))) return 'missing-values'
  return item.sets.every((set) => set.completed) ? 'complete' : 'ready-to-confirm'
}

export function calculateBmi(weightKg?: number, heightCm?: number): number | undefined {
  if (!positive(weightKg) || !positive(heightCm)) return undefined
  const heightMeters = heightCm / 100
  return Math.round((weightKg / (heightMeters * heightMeters)) * 10) / 10
}

export function kgToLb(value: number) {
  return value * 2.2046226218
}

export function lbToKg(value: number) {
  return value / 2.2046226218
}

function positive(value?: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
