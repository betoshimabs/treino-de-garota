import Dexie, { type EntityTable } from 'dexie'
import type { AppSnapshot, Exercise, Profile, TimelineEntry, Workout, WorkoutTemplate } from './types'

const defaultProfile: Profile = {
  id: 'me',
  nickname: '',
  loadUnit: 'kg',
  bodyWeightEnabled: false,
  onboarded: false,
}

class TreinoDatabase extends Dexie {
  workouts!: EntityTable<Workout, 'id'>
  timeline!: EntityTable<TimelineEntry, 'id'>
  favorites!: EntityTable<{ exerciseId: string }, 'exerciseId'>
  customExercises!: EntityTable<Exercise, 'id'>
  customTemplates!: EntityTable<WorkoutTemplate, 'id'>
  profiles!: EntityTable<Profile, 'id'>

  constructor() {
    super('treino-de-garota')
    this.version(1).stores({
      workouts: 'id, status, startedAt, endedAt',
      timeline: 'id, kind, occurredAt, isMilestone, sourceId',
      favorites: 'exerciseId',
      customExercises: 'id, name, group, origin',
      profiles: 'id',
    })
    this.version(2).stores({
      workouts: 'id, status, startedAt, endedAt',
      timeline: 'id, kind, occurredAt, isMilestone, sourceId',
      favorites: 'exerciseId',
      customExercises: 'id, name, group, origin, category, metricMode',
      customTemplates: 'id, name, origin',
      profiles: 'id',
    }).upgrade(async (transaction) => {
      await transaction.table<Workout>('workouts').toCollection().modify((workout) => {
        workout.restSeconds ??= 90
        workout.items = workout.items.map((item) => ({
          ...item,
          category: item.category ?? (['esteira', 'bicicleta'].includes(item.exerciseId) ? 'cardio' : 'strength'),
          metricMode: item.metricMode ?? (['esteira', 'bicicleta'].includes(item.exerciseId) ? 'distance-time' : 'load-reps'),
        }))
      })
      await transaction.table<Exercise>('customExercises').toCollection().modify((exercise) => {
        exercise.category ??= 'strength'
        exercise.metricMode ??= 'load-reps'
        exercise.visual ??= 'flow'
      })
    })
  }
}

export const db = new TreinoDatabase()

export async function loadSnapshot(): Promise<AppSnapshot> {
  const [workouts, timeline, favoriteRows, customExercises, customTemplates, storedProfile] = await Promise.all([
    db.workouts.toArray(),
    db.timeline.toArray(),
    db.favorites.toArray(),
    db.customExercises.toArray(),
    db.customTemplates.toArray(),
    db.profiles.get('me'),
  ])

  return {
    workouts: workouts.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    timeline: timeline.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    favorites: favoriteRows.map((row) => row.exerciseId),
    customExercises,
    customTemplates,
    profile: { ...defaultProfile, ...storedProfile },
  }
}

export async function saveProfile(profile: Profile) {
  await db.profiles.put(profile)
}

export async function clearAllData() {
  await db.transaction('rw', [db.workouts, db.timeline, db.favorites, db.customExercises, db.customTemplates, db.profiles], async () => {
    await Promise.all([
      db.workouts.clear(),
      db.timeline.clear(),
      db.favorites.clear(),
      db.customExercises.clear(),
      db.customTemplates.clear(),
      db.profiles.clear(),
    ])
  })
}

export { defaultProfile }
