import { defaultMetricsForMode, kgToLb, lbToKg } from './domain'
import { canonicalRegions, muscleGroups, macroGroups } from './muscle-taxonomy'
import type { Exercise, LoadUnit, MuscleRegionId, Workout, WorkoutItem, WorkoutMetric, WorkoutSet } from './types'

export const regionLabels = muscleGroups
export const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
export const metricsOf = (item: WorkoutItem, set: WorkoutSet) => set.metrics ?? item.metrics ?? defaultMetricsForMode(item.metricMode)
export function validCompleted(item: WorkoutItem, set: WorkoutSet) {
  const metrics = metricsOf(item, set)
  return set.completed && metrics.length > 0 && metrics.every(metric => positive(measure(set, metric)))
}
export function measure(set: WorkoutSet, metric: WorkoutMetric) { return metric === 'load' ? set.load : metric === 'reps' ? set.reps : metric === 'duration' ? set.durationMinutes : set.distanceKm }
const dayFormatters = new Map<string, Intl.DateTimeFormat>()
export function dayKey(value: string | number | Date, timeZone?: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  try {
    const key = timeZone ?? 'local'
    let formatter = dayFormatters.get(key)
    if (!formatter) { formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }); dayFormatters.set(key, formatter) }
    const parts = formatter.formatToParts(date)
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
      const direct = canonicalRegions(analysis.primaryRegions).some(id => id === row.id)
      const supporting = !direct && canonicalRegions(analysis.secondaryRegions).some(id => id === row.id)
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

export type EvolutionPeriod = '4w' | '12w' | '6m' | '12m'
export const evolutionPeriods: { id: EvolutionPeriod; label: string }[] = [{ id: '4w', label: '4 semanas' }, { id: '12w', label: '12 semanas' }, { id: '6m', label: '6 meses' }, { id: '12m', label: '12 meses' }]
const localDate = (day: string) => new Date(`${day}T12:00:00`)
export function periodWindow(period: EvolutionPeriod, now = new Date()) {
  const end = localDate(dayKey(now)); const start = new Date(end)
  if (period.endsWith('w')) start.setDate(start.getDate() - (period === '4w' ? 28 : 84) + 1)
  else {
    const date = start.getDate(); start.setDate(1)
    start.setMonth(start.getMonth() - (period === '6m' ? 6 : 12))
    start.setDate(Math.min(date, new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()))
    start.setDate(start.getDate() + 1)
  }
  const days: string[] = []
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) days.push(dayKey(date))
  const previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate() - 1)
  return { days, previousDays: periodDays(days.length, previousEnd) }
}
export function workoutsInDays(workouts: Workout[], days: string[]) {
  const allowed = new Set(days)
  return workouts.filter(w => w.status === 'completed' && allowed.has(dayKey(w.startedAt, w.timeZone)) && w.items.some(i => i.sets.some(s => validCompleted(i, s)))).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
}
export function executionRanking(workouts: Workout[], exercises: Exercise[]) {
  const counts = new Map<string, { id: string; name: string; count: number }>()
  for (const workout of workouts) {
    const seen = new Set<string>()
    for (const item of workout.items) if (!seen.has(item.exerciseId) && item.sets.some(set => validCompleted(item, set))) {
      seen.add(item.exerciseId)
      const row = counts.get(item.exerciseId) ?? { id: item.exerciseId, name: exercises.find(e => e.id === item.exerciseId)?.name ?? item.exerciseName, count: 0 }
      row.count++; counts.set(item.exerciseId, row)
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id))
}
export function extrema<T extends { value: number }>(points: T[]) {
  if (!points.length) return undefined
  let min = 0; let max = 0
  points.forEach((p, index) => { if (p.value < points[min].value) min = index; if (p.value > points[max].value) max = index })
  return { min, max }
}
export const recordedMetrics: WorkoutMetric[] = ['load', 'reps', 'distance', 'duration']
interface MetricRecord {
  value: number; exerciseId: string; name: string; workoutId: string; setId: string; itemId: string;
  date: string; day: string; comparisonKey: string
}
/** One completed row = one observation. No synthetic volume, averages of averages or session clock. */
export function metricRecords(workouts: Workout[], metric: WorkoutMetric, unit: LoadUnit): MetricRecord[] {
  return workouts.filter(w => w.status === 'completed').flatMap(workout => workout.items.flatMap(item => item.sets.flatMap(set => {
    if (!validCompleted(item, set) || !metricsOf(item, set).includes(metric)) return []
    let value = measure(set, metric)!
    if (metric === 'load') {
      const recordedUnit = set.loadUnit ?? workout.loadUnit
      if (!recordedUnit || !item.analysis || ['assistance', 'none'].includes(item.analysis.loadConvention)) return []
      if (recordedUnit !== unit) value = unit === 'kg' ? lbToKg(value) : kgToLb(value)
    }
    return [{ value: Math.round(value * 100) / 100, exerciseId: item.exerciseId, name: item.exerciseName, workoutId: workout.id, itemId: item.id, setId: set.id,
      date: set.completedAt && Number.isFinite(Date.parse(set.completedAt)) ? set.completedAt : workout.startedAt,
      day: dayKey(workout.startedAt, workout.timeZone),
      comparisonKey: `${item.exerciseId}/${metric}/${metric === 'load' ? item.analysis!.loadConvention : metric === 'reps' ? item.analysis?.repetitions ?? 'legacy' : 'record'}` }]
  }))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}
export function metricHighlights(workouts: Workout[], history: Workout[], unit: LoadUnit) {
  return recordedMetrics.map(metric => {
    const rows = metricRecords(workouts, metric, unit)
    const maximum = rows.length ? rows[extrema(rows)!.max] : undefined
    const all = metricRecords(history, metric, unit)
    // Derived from original IDs on every revision: edits/deletes/imports cannot leave stale badges.
    const personalBests = new Map<string, MetricRecord>()
    for (const row of all) if (!personalBests.has(row.comparisonKey) || row.value > personalBests.get(row.comparisonKey)!.value) personalBests.set(row.comparisonKey, row)
    const best = maximum && personalBests.get(maximum.comparisonKey)
    const personalRecord = !!maximum && !!best && best.workoutId === maximum.workoutId && best.itemId === maximum.itemId && best.setId === maximum.setId
    return { metric, maximum, personalRecord, count: rows.length, average: rows.length ? rows.reduce((sum, row) => sum + row.value, 0) / rows.length : undefined }
  })
}
export function weeklyFrequency(workouts: Workout[], days: string[]) {
  const counts = new Map<string, number>()
  for (const w of workouts) { const day = dayKey(w.startedAt, w.timeZone); counts.set(day, (counts.get(day) ?? 0) + 1) }
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
    const dates = days.slice(index * 7, index * 7 + 7)
    return { date: dates[0], end: dates.at(-1)!, value: dates.reduce((sum, day) => sum + (counts.get(day) ?? 0), 0) }
  })
}
export function muscleShares(workouts: Workout[], exercises: Exercise[], includeSupport: boolean) {
  const distribution = regionDistribution(workouts, exercises)
  const total = distribution.rows.reduce((sum, row) => sum + row.direct + (includeSupport ? row.supporting : 0), 0)
  const groups = distribution.rows.map(row => ({ ...row, count: row.direct + (includeSupport ? row.supporting : 0), percent: total ? (row.direct + (includeSupport ? row.supporting : 0)) / total * 100 : 0 }))
  const macros = macroGroups.map(macro => {
    const members = groups.filter(row => macro.groups.some(id => id === row.id))
    const count = members.reduce((sum, row) => sum + row.count, 0)
    return { id: macro.id, label: macro.label, count, percent: total ? count / total * 100 : 0 }
  })
  return { ...distribution, groups, macros, total }
}
export function effortCalendar(workouts: Workout[], days: string[]) {
  const scores = { leve: 1, normal: 2, intenso: 3 }
  const byDay = new Map<string, Workout[]>()
  for (const w of workouts) { const key = dayKey(w.startedAt, w.timeZone); byDay.set(key, [...(byDay.get(key) ?? []), w]) }
  return days.map(date => {
    const sessions = byDay.get(date) ?? []
    const marked = sessions.flatMap(w => w.feeling ? [scores[w.feeling]] : [])
    const average = marked.length ? marked.reduce((sum, score) => sum + score, 0) / marked.length : undefined
    return { date, sessions: sessions.length, marked: marked.length, average, level: average === undefined ? 0 : Math.round(average) }
  })
}

export function effortCells(days: ReturnType<typeof effortCalendar>, period: EvolutionPeriod) {
  const size = { '4w': 1, '12w': 3, '6m': 7, '12m': 14 }[period]
  return Array.from({ length: Math.ceil(days.length / size) }, (_, index) => {
    const slice = days.slice(index * size, (index + 1) * size)
    const marked = slice.reduce((sum, d) => sum + d.marked, 0)
    const average = marked ? slice.reduce((sum, d) => sum + (d.average ?? 0) * d.marked, 0) / marked : undefined
    return { date: slice[0].date, end: slice.at(-1)!.date, days: slice.length,
      sessions: slice.reduce((sum, d) => sum + d.sessions, 0), marked, average,
      level: average === undefined ? 0 : Math.round(average) }
  })
}
