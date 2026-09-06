export type LoadUnit = 'kg' | 'lb'
export type WorkoutStatus = 'active' | 'completed'
export type Feeling = 'leve' | 'normal' | 'intenso'
export type ActivityCategory = 'strength' | 'cardio' | 'other'
export type MetricMode = 'load-reps' | 'reps-only' | 'distance-time' | 'time-only'
export type WorkoutMetric = 'load' | 'reps' | 'distance' | 'duration'
export type ExerciseVisual = 'squat' | 'press' | 'hinge' | 'bridge' | 'lunge' | 'pull' | 'raise' | 'curl' | 'plank' | 'walk' | 'cycle' | 'flow'
export type AvatarPresetId = 'flex' | 'bottle' | 'lift' | 'run'
export type ProfileAvatar = { type: 'preset'; presetId: AvatarPresetId } | { type: 'custom'; dataUrl: string }

export type ExperienceLevel = 'Iniciante' | 'Intermediário' | 'Avançado'
export type TrainingFocus = 'Corpo inteiro' | 'Inferiores' | 'Superiores' | 'Core' | 'Cardio' | 'Prática livre'
export type MuscleRegionId = 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques' | 'upperBack' | 'lats' | 'lowerBack' | 'glutes' | 'hips' | 'quads' | 'adductors' | 'hamstrings' | 'calves'
export type LoadConvention = 'total' | 'per-implement' | 'machine' | 'assistance' | 'none'
export interface ExerciseAnalysis {
  version: string
  kind: 'movement' | 'session'
  familiarity: ExperienceLevel
  focus: TrainingFocus
  primaryRegions: MuscleRegionId[]
  secondaryRegions: MuscleRegionId[]
  loadConvention: LoadConvention
  repetitions: 'bilateral' | 'per-side' | 'alternating' | 'time'
}
export interface ExerciseEditorial {
  reviewedAt: string
  setup: string
  care: string
  recordingHint: string
  references: { name: string; url: string }[]
}

export interface ExerciseMedia {
  posterSrc: string
  motionSrc: string
  alt: string
}

export interface ExerciseCuration {
  primaryMuscles: string[]
  secondaryMuscles: string[]
  movementPattern: string
  stimulusToFatigue?: 'baixo' | 'moderado' | 'alto'
  suggestedRepRange?: { minimum: number; maximum: number }
  reviewStatus: 'em-revisao' | 'revisado'
  source: {
    name: string
    recordId: string
    url: string
    license: string
  }
}

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
  media?: ExerciseMedia
  curation?: ExerciseCuration
  analysis?: ExerciseAnalysis
  editorial?: ExerciseEditorial
}

export interface WorkoutSet {
  id: string
  load?: number
  reps?: number
  distanceKm?: number
  durationMinutes?: number
  completed: boolean
  completedAt?: string
  metrics?: WorkoutMetric[]
  /** Capturada ao concluir. Ausente significa unidade desconhecida no registro legado. */
  loadUnit?: LoadUnit
}

export interface WorkoutRest {
  id: string
  itemId: string
  exerciseName: string
  setId?: string
  startedAt: string
  plannedSeconds: number
  initialPlannedSeconds?: number
  adjustments?: { at: string; deltaSeconds: number }[]
  endedAt?: string
  actualSeconds?: number
  outcome?: 'completed' | 'interrupted'
}

export interface WorkoutItem {
  id: string
  exerciseId: string
  exerciseName: string
  category: ActivityCategory
  metricMode: MetricMode
  /** Métricas escolhidas neste treino. Ausente em registros antigos, que usam metricMode como padrão. */
  metrics?: WorkoutMetric[]
  sets: WorkoutSet[]
  note?: string
  /** Classificação no momento da inclusão: novas curadorias não reescrevem o histórico. */
  analysis?: ExerciseAnalysis
}

export interface Workout {
  id: string
  title: string
  /** Sugestões automáticas param quando a pessoa personaliza o título. */
  titleMode?: 'auto' | 'custom'
  /** Versão textual quando a sugestão visual usa emoji. */
  titleTextAlternative?: string
  status: WorkoutStatus
  startedAt: string
  /** Presente quando a sessão nasceu de um modelo, para orientar a sequência sem travar edições. */
  sourceTemplateId?: string
  endedAt?: string
  items: WorkoutItem[]
  feeling?: Feeling
  note?: string
  restSeconds?: number
  rests?: WorkoutRest[]
  currentItemId?: string
  loadUnit?: LoadUnit
  timeZone?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  note: string
  exerciseIds: string[]
  origin: 'system' | 'custom'
  level?: ExperienceLevel
  focus?: TrainingFocus
  intention?: string
  preparation?: string
}

export type TimelineKind = 'workout' | 'note' | 'photo'

export interface TimelineEntry {
  id: string
  kind: TimelineKind
  occurredAt: string
  title: string
  titleTextAlternative?: string
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
  avatar?: ProfileAvatar
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
