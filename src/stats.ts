import type { Workout } from './types'

export function completedWorkouts(workouts: Workout[]) {
  return workouts.filter((workout) => workout.status === 'completed')
}

export function totalCompletedSets(workouts: Workout[]) {
  return completedWorkouts(workouts).reduce(
    (total, workout) => total + workout.items.reduce((itemTotal, item) => itemTotal + item.sets.filter((set) => set.completed).length, 0),
    0,
  )
}

export function thisMonthCount(workouts: Workout[], now = new Date()) {
  return completedWorkouts(workouts).filter((workout) => {
    const date = new Date(workout.endedAt ?? workout.startedAt)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }).length
}

export function workoutDurationMinutes(workout: Workout) {
  if (!workout.endedAt) return 0
  return Math.max(1, Math.round((new Date(workout.endedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000))
}

export function exerciseProgress(workouts: Workout[], exerciseId: string) {
  return completedWorkouts(workouts)
    .map((workout) => {
      const loads = workout.items
        .filter((item) => item.exerciseId === exerciseId)
        .flatMap((item) => item.sets)
        .filter((set) => set.completed && typeof set.load === 'number')
        .map((set) => set.load as number)
      if (!loads.length) return null
      return { date: workout.endedAt ?? workout.startedAt, value: Math.max(...loads) }
    })
    .filter((point): point is { date: string; value: number } => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}
