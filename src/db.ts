import Dexie, { type EntityTable } from 'dexie'
import type { AppSnapshot, Exercise, Profile, TimelineEntry, Workout } from './types'

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
  }
}

export const db = new TreinoDatabase()

export async function loadSnapshot(): Promise<AppSnapshot> {
  const [workouts, timeline, favoriteRows, customExercises, storedProfile] = await Promise.all([
    db.workouts.toArray(),
    db.timeline.toArray(),
    db.favorites.toArray(),
    db.customExercises.toArray(),
    db.profiles.get('me'),
  ])

  return {
    workouts: workouts.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    timeline: timeline.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    favorites: favoriteRows.map((row) => row.exerciseId),
    customExercises,
    profile: storedProfile ?? defaultProfile,
  }
}

export async function saveProfile(profile: Profile) {
  await db.profiles.put(profile)
}

export async function clearAllData() {
  await db.transaction('rw', [db.workouts, db.timeline, db.favorites, db.customExercises, db.profiles], async () => {
    await Promise.all([
      db.workouts.clear(),
      db.timeline.clear(),
      db.favorites.clear(),
      db.customExercises.clear(),
      db.profiles.clear(),
    ])
  })
}

export { defaultProfile }
