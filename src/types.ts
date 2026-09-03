export type LoadUnit = 'kg' | 'lb'
export type WorkoutStatus = 'active' | 'completed'
export type Feeling = 'leve' | 'normal' | 'intenso'
export type ActivityCategory = 'strength' | 'cardio' | 'other'
export type MetricMode = 'load-reps' | 'reps-only' | 'distance-time' | 'time-only'
export type ExerciseVisual = 'squat' | 'press' | 'hinge' | 'bridge' | 'lunge' | 'pull' | 'raise' | 'curl' | 'plank' | 'walk' | 'cycle' | 'flow'

export interface Exercise {
  id: string
  name: string
  aliases: string[]
  group: string
  equipment: string
  instructions: string[]
  origin: 'system' | 'custom'
  category: ActivityCategory
  metricMode: MetricMode
  visual: ExerciseVisual
}

export interface WorkoutSet {
  id: string
  load?: number
  reps?: number
  distanceKm?: number
  durationMinutes?: number
  completed: boolean
}

export interface WorkoutItem {
  id: string
  exerciseId: string
  exerciseName: string
  category: ActivityCategory
  metricMode: MetricMode
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
  restSeconds?: number
}

export interface WorkoutTemplate {
  id: string
  name: string
  note: string
  exerciseIds: string[]
  origin: 'system' | 'custom'
}

export type TimelineKind = 'workout' | 'note' | 'photo'

export interface TimelineEntry {
  id: string
  kind: TimelineKind
  occurredAt: string
  title: string
  text?: string
  imageDataUrls?: string[]
  /** Mantido para ler registros e backups criados antes da galeria múltipla. */
  imageDataUrl?: string
  isMilestone: boolean
  sourceId?: string
}

export interface Profile {
  id: 'me'
  nickname: string
  loadUnit: LoadUnit
  bodyWeightEnabled: boolean
  bodyWeightKg?: number
  heightCm?: number
  showBmi?: boolean
  menstrualCycleDays?: number
  pregnancyStatus?: 'pregnant' | 'not-pregnant'
  onboarded: boolean
}

export interface AppSnapshot {
  workouts: Workout[]
  timeline: TimelineEntry[]
  favorites: string[]
  customExercises: Exercise[]
  customTemplates: WorkoutTemplate[]
  profile: Profile
}
