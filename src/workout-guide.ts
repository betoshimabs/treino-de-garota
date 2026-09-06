import type { Workout, WorkoutRest, WorkoutSet, WorkoutMetric } from './types'
import { isSetValidForMetrics } from './domain'

export function closeRest(rest: WorkoutRest, now: number): WorkoutRest {
  if (rest.endedAt) return rest
  const start = Date.parse(rest.startedAt)
  const elapsed = Math.max(0, (now - start) / 1000)
  const actualSeconds = Math.min(rest.plannedSeconds, Math.floor(elapsed))
  return { ...rest, actualSeconds, endedAt: new Date(start + actualSeconds * 1000).toISOString(), outcome: elapsed >= rest.plannedSeconds ? 'completed' : 'interrupted' }
}

export function settleRests(workout: Workout, now: number, interrupt = false): Workout {
  return { ...workout, rests: (workout.rests ?? []).map(rest => !rest.endedAt && (interrupt || now >= Date.parse(rest.startedAt) + rest.plannedSeconds * 1000) ? closeRest(rest, now) : rest) }
}

export function adjustRest(workout: Workout, restId: string, delta: -15 | 15, now: number): Workout {
  const settled = settleRests(workout, now)
  return { ...settled, rests: settled.rests?.map(rest => {
    if (rest.id !== restId || rest.endedAt) return rest
    const elapsed = Math.max(0, (now - Date.parse(rest.startedAt)) / 1000)
    // Keep at most three minutes remaining; shortening never erases elapsed time.
    const plannedSeconds = Math.max(Math.floor(elapsed), Math.min(Math.floor(elapsed) + 180, rest.plannedSeconds + delta))
    if (plannedSeconds === rest.plannedSeconds) return rest
    const updated = { ...rest, plannedSeconds, initialPlannedSeconds: rest.initialPlannedSeconds ?? rest.plannedSeconds, adjustments: [...(rest.adjustments ?? []), { at: new Date(now).toISOString(), deltaSeconds: plannedSeconds - rest.plannedSeconds }] }
    return plannedSeconds <= elapsed ? closeRest(updated, now) : updated
  }) }
}

export function recordGuidedSet(workout: Workout, itemId: string, set: WorkoutSet, metrics: WorkoutMetric[], now: string): Workout {
  if (!isSetValidForMetrics(set, metrics)) throw new Error('Preencha todas as medidas escolhidas com valores maiores que zero.')
  const item = workout.items.find(row => row.id === itemId)
  if (!item) throw new Error('Este exercício foi removido. Escolha outro para continuar.')
  const existing = item.sets.find(row => row.id === set.id)
  if (existing?.completed) return workout
  const completed = { ...set, metrics: [...metrics], completed: true, completedAt: now }
  const settled = settleRests(workout, Date.parse(now), true)
  return { ...settled, rests: [...(settled.rests ?? []), { id: crypto.randomUUID(), itemId, exerciseName: item.exerciseName, setId: set.id, startedAt: now, plannedSeconds: 30 }], items: workout.items.map(row => row.id !== itemId ? row : { ...row, metrics, sets: existing ? row.sets.map(entry => entry.id === set.id ? completed : entry) : [...row.sets, completed] }) }
}

export function nextCreatedItem(workout: Workout, itemId: string) {
  const index = workout.items.findIndex(item => item.id === itemId)
  return index < 0 ? undefined : workout.items[index + 1]
}

export function copySetForNextSeries(previous?: WorkoutSet): WorkoutSet {
  return { id: crypto.randomUUID(), completed: false, load: previous?.load, reps: previous?.reps, distanceKm: previous?.distanceKm, durationMinutes: previous?.durationMinutes }
}
