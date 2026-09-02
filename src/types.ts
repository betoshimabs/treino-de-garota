export type LoadUnit = 'kg' | 'lb'
export type WorkoutStatus = 'active' | 'completed'
export type Feeling = 'leve' | 'normal' | 'intenso'

export interface Exercise {
  id: string
  name: string
  aliases: string[]
  group: string
  equipment: string
  instructions: string[]
  origin: 'system' | 'custom'
}

export interface WorkoutSet {
  id: string
  load?: number
  reps?: number
  completed: boolean
}

export interface WorkoutItem {
  id: string
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
  note?: string
}

export interface Workout {
  id: string
  title: string
  status: WorkoutStatus
  startedAt: string
  endedAt?: string
  items: WorkoutItem[]
  feeling?: Feeling
  note?: string
}

export type TimelineKind = 'workout' | 'note' | 'photo'

export interface TimelineEntry {
  id: string
  kind: TimelineKind
  occurredAt: string
  title: string
  text?: string
  imageDataUrl?: string
  isMilestone: boolean
  sourceId?: string
}

export interface Profile {
  id: 'me'
  nickname: string
  loadUnit: LoadUnit
  bodyWeightEnabled: boolean
  onboarded: boolean
}

export interface AppSnapshot {
  workouts: Workout[]
  timeline: TimelineEntry[]
  favorites: string[]
  customExercises: Exercise[]
  profile: Profile
}
