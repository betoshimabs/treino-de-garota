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

  constructor(name: string) {
    super(name)
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

const LEGACY_DATABASE_NAME = 'treino-de-garota'
const USER_DATABASE_PREFIX = 'brabita-user-'
const LEGACY_MIGRATION_KEY = 'brabita-legacy-data-migration'

let activeUserId: string | undefined
export let db = new TreinoDatabase('brabita-not-ready')

function databaseNameForUser(userId: string) {
  return `${USER_DATABASE_PREFIX}${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

export function useDatabaseForUser(userId: string) {
  if (activeUserId === userId) return
  db.close()
  db = new TreinoDatabase(databaseNameForUser(userId))
  activeUserId = userId
}

async function databaseHasContent(database: TreinoDatabase) {
  const counts = await Promise.all([
    database.workouts.count(),
    database.timeline.count(),
    database.favorites.count(),
    database.customExercises.count(),
    database.customTemplates.count(),
    database.profiles.count(),
  ])
  return counts.some((count) => count > 0)
}

export async function shouldOfferLegacyDataImport() {
  if (localStorage.getItem(LEGACY_MIGRATION_KEY)) return false
  if (await databaseHasContent(db)) return false
  if (!(await Dexie.exists(LEGACY_DATABASE_NAME))) return false
  const legacy = new TreinoDatabase(LEGACY_DATABASE_NAME)
  try {
    return await databaseHasContent(legacy)
  } finally {
    legacy.close()
  }
}

export async function importLegacyDataForCurrentUser() {
  const legacy = new TreinoDatabase(LEGACY_DATABASE_NAME)
  try {
    const [workouts, timeline, favorites, customExercises, customTemplates, profiles] = await Promise.all([
      legacy.workouts.toArray(),
      legacy.timeline.toArray(),
      legacy.favorites.toArray(),
      legacy.customExercises.toArray(),
      legacy.customTemplates.toArray(),
      legacy.profiles.toArray(),
    ])
    await db.transaction('rw', [db.workouts, db.timeline, db.favorites, db.customExercises, db.customTemplates, db.profiles], async () => {
      await Promise.all([
        db.workouts.bulkPut(workouts),
        db.timeline.bulkPut(timeline),
        db.favorites.bulkPut(favorites),
        db.customExercises.bulkPut(customExercises),
        db.customTemplates.bulkPut(customTemplates),
        db.profiles.bulkPut(profiles),
      ])
    })
    localStorage.setItem(LEGACY_MIGRATION_KEY, `claimed:${activeUserId ?? 'unknown'}`)
  } finally {
    legacy.close()
  }
}

export function keepLegacyDataSeparate() {
  localStorage.setItem(LEGACY_MIGRATION_KEY, 'kept-separate')
}

export async function deleteDatabaseForUser(userId: string) {
  if (activeUserId === userId) {
    db.close()
    activeUserId = undefined
  }
  await Dexie.delete(databaseNameForUser(userId))
}

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
