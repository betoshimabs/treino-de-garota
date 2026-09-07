import type { MuscleRegionId } from './types'

/** Product taxonomy v1. Legacy region IDs remain readable in historical snapshots. */
export const muscleGroups = {
  chest: 'Peitoral', back: 'Costas', shoulders: 'Ombros', biceps: 'Bíceps',
  triceps: 'Tríceps', forearms: 'Antebraços', abs: 'Abdômen', lowerBack: 'Lombar',
  glutes: 'Glúteos', quads: 'Quadríceps', hamstrings: 'Posteriores', adductors: 'Adutores',
  abductors: 'Abdutores', calves: 'Panturrilhas',
} as const
export type MuscleGroup = keyof typeof muscleGroups
export const macroGroups = [
  { id: 'chest', label: 'Peito', groups: ['chest'] },
  { id: 'back', label: 'Costas', groups: ['back'] },
  { id: 'shoulders', label: 'Ombros', groups: ['shoulders'] },
  { id: 'arms', label: 'Braços', groups: ['biceps', 'triceps', 'forearms'] },
  { id: 'core', label: 'Core', groups: ['abs', 'lowerBack'] },
  { id: 'glutes', label: 'Glúteos', groups: ['glutes'] },
  { id: 'legs', label: 'Pernas', groups: ['quads', 'hamstrings', 'adductors', 'abductors', 'calves'] },
] as const satisfies readonly { id: string; label: string; groups: readonly MuscleGroup[] }[]
export function canonicalRegion(region: MuscleRegionId): MuscleGroup {
  if (region === 'lats' || region === 'upperBack') return 'back'
  if (region === 'obliques') return 'abs'
  if (region === 'hips') return 'abductors'
  return region
}
export const canonicalRegions = (regions: MuscleRegionId[]) => [...new Set(regions.map(canonicalRegion))]
