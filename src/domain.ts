import type { MetricMode, WorkoutSet } from './types'

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
  if (metricMode === 'load-reps') return positive(set.load) && positive(set.reps)
  if (metricMode === 'reps-only') return positive(set.reps)
  if (metricMode === 'distance-time') return positive(set.distanceKm) && positive(set.durationMinutes)
  return positive(set.durationMinutes)
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
