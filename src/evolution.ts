import { defaultMetricsForMode, kgToLb, lbToKg } from './domain'
import type { Exercise, LoadUnit, MuscleRegionId, Workout, WorkoutItem, WorkoutMetric, WorkoutSet } from './types'

export const regionLabels: Record<MuscleRegionId, string> = { chest: 'Peito', shoulders: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraços', abs: 'Abdômen', obliques: 'Oblíquos', upperBack: 'Parte alta das costas', lats: 'Dorsais', lowerBack: 'Lombar', glutes: 'Glúteos', hips: 'Lateral do quadril', quads: 'Quadríceps', adductors: 'Adutores', hamstrings: 'Posteriores', calves: 'Panturrilhas' }
export const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
export const metricsOf = (item: WorkoutItem, set: WorkoutSet) => set.metrics ?? item.metrics ?? defaultMetricsForMode(item.metricMode)
export function validCompleted(item: WorkoutItem, set: WorkoutSet) {
  const metrics = metricsOf(item, set)
  return set.completed && metrics.length > 0 && metrics.every(metric => positive(measure(set, metric)))
}
export function measure(set: WorkoutSet, metric: WorkoutMetric) { return metric === 'load' ? set.load : metric === 'reps' ? set.reps : metric === 'duration' ? set.durationMinutes : set.distanceKm }
export function dayKey(value: string | number | Date, timeZone?: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
  } catch { return dayKey(value) }
}
export function periodDays(length: number, now = new Date()): string[] {
  return Array.from({ length }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - length + 1 + index); return dayKey(date) })
}
export function selectPeriod(workouts: Workout[], length: number, now = new Date()) {
  const days = periodDays(length, now); const first = days[0]; const last = days.at(-1)!
  return workouts.filter(workout => { const day = dayKey(workout.startedAt, workout.timeZone); return workout.status === 'completed' && day >= first && day <= last && workout.items.some(item => item.sets.some(set => validCompleted(item, set))) }).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
}

/** Union of recorded, closed rest intervals. Never count elapsed but unrecorded time as rest. */
export function recordedRestSeconds(workout: Workout) {
  const start = Date.parse(workout.startedAt); const end = Date.parse(workout.endedAt ?? '')
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  const intervals = (workout.rests ?? []).flatMap(rest => {
    const from = Math.max(start, Date.parse(rest.startedAt)); const ended = Date.parse(rest.endedAt ?? '')
    if (!rest.endedAt || !Number.isFinite(from) || !Number.isFinite(ended)) return []
    const actual = typeof rest.actualSeconds === 'number' && Number.isFinite(rest.actualSeconds) ? Math.max(0, rest.actualSeconds) : Math.max(0, Math.min(rest.plannedSeconds, (ended - from) / 1000))
    const to = Math.min(end, ended, from + actual * 1000)
    return to > from ? [[from, to]] : []
  }).sort((a, b) => a[0] - b[0])
  let total = 0; let until = -Infinity
  for (const [from, to] of intervals) { total += Math.max(0, to - Math.max(from, until)); until = Math.max(until, to) }
  return Math.floor(total / 1000)
}
export function periodSummary(workouts: Workout[]) {
  const days = new Set<string>(); let sets = 0; let activityRecords = 0; let elapsedMinutes = 0; let restSeconds = 0; let invalidRecords = 0
  const feelings = { leve: 0, normal: 0, intenso: 0, unmarked: 0 }
  for (const workout of workouts) {
    days.add(dayKey(workout.startedAt, workout.timeZone))
    const duration = (Date.parse(workout.endedAt ?? '') - Date.parse(workout.startedAt)) / 60000
    if (positive(duration)) elapsedMinutes += duration
    restSeconds += recordedRestSeconds(workout)
    feelings[workout.feeling ?? 'unmarked']++
    for (const item of workout.items) for (const set of item.sets) {
      if (!validCompleted(item, set)) { invalidRecords++; continue }
      if (item.category === 'strength') sets++; else activityRecords++
    }
  }
  return { sessions: workouts.length, days: days.size, sets, activityRecords, elapsedMinutes: Math.round(elapsedMinutes), restSeconds, invalidRecords, feelings }
}

export function regionDistribution(workouts: Workout[], exercises: Exercise[]) {
  const rows = Object.entries(regionLabels).map(([id, label]) => ({ id: id as MuscleRegionId, label, direct: 0, supporting: 0, exerciseIds: new Set<string>() }))
  let legacySets = 0; let unmappedSets = 0
  for (const workout of workouts) for (const item of workout.items) {
    if (item.category !== 'strength') continue
    const count = item.sets.filter(set => validCompleted(item, set)).length
    if (!count) continue
    const analysis = item.analysis ?? exercises.find(exercise => exercise.id === item.exerciseId)?.analysis
    if (!analysis || analysis.kind !== 'movement') { unmappedSets += count; continue }
    if (!item.analysis) legacySets += count
    for (const row of rows) {
      const direct = analysis.primaryRegions.includes(row.id)
      const supporting = !direct && analysis.secondaryRegions.includes(row.id)
      if (direct) row.direct += count
      if (supporting) row.supporting += count
      if (direct || supporting) row.exerciseIds.add(item.exerciseId)
    }
  }
  return { rows, legacySets, unmappedSets }
}

export type ProgressMetric = WorkoutMetric | 'pace'
export interface ProgressPoint { workoutId: string; title: string; date: string; localDay: string; value: number; description: string }
export function exerciseSeries(workouts: Workout[], exerciseId: string, metric: ProgressMetric, unit: LoadUnit, convention?: string) {
  const points: ProgressPoint[] = []; let excluded = 0
  for (const workout of workouts) {
    const values: { value: number; reps?: number }[] = []
    for (const item of workout.items.filter(item => item.exerciseId === exerciseId)) for (const set of item.sets) {
      if (!validCompleted(item, set)) continue
      const metrics = metricsOf(item, set)
      if (metric === 'pace') {
        if (metrics.includes('distance') && metrics.includes('duration') && positive(set.distanceKm) && positive(set.durationMinutes)) values.push({ value: set.durationMinutes / set.distanceKm })
        continue
      }
      if (!metrics.includes(metric)) continue
      const value = measure(set, metric)
      if (!positive(value)) continue
      if (metric === 'load') {
        const recordedUnit = set.loadUnit ?? workout.loadUnit
        if (!recordedUnit || !item.analysis || item.analysis.loadConvention !== convention) { excluded++; continue }
        values.push({ value: unit === recordedUnit ? value : unit === 'kg' ? lbToKg(value) : kgToLb(value), reps: metrics.includes('reps') ? set.reps : undefined })
      } else values.push({ value })
    }
    if (!values.length) continue
    // Distance/time = sums of logged blocks. Pace = weighted by distance, never mean of paces.
    let value: number
    if (metric === 'pace') {
      const paired = workout.items.filter(item => item.exerciseId === exerciseId).flatMap(item => item.sets.filter(set => validCompleted(item, set) && metricsOf(item, set).includes('distance') && metricsOf(item, set).includes('duration') && positive(set.distanceKm) && positive(set.durationMinutes)))
      value = paired.reduce((sum, set) => sum + set.durationMinutes!, 0) / paired.reduce((sum, set) => sum + set.distanceKm!, 0)
    } else value = metric === 'distance' || metric === 'duration' ? values.reduce((sum, row) => sum + row.value, 0) : metric === 'load' && convention === 'assistance' ? Math.min(...values.map(row => row.value)) : Math.max(...values.map(row => row.value))
    const strongest = values.find(row => row.value === value)
    points.push({ workoutId: workout.id, title: workout.title, date: workout.startedAt, localDay: dayKey(workout.startedAt, workout.timeZone), value: Math.round(value * 100) / 100, description: metric === 'load' && strongest?.reps ? `${strongest.reps} repetições nessa carga` : `${values.length} ${values.length === 1 ? 'registro considerado' : 'registros considerados'}` })
  }
  return { points, excluded }
}
