// Region-level schematic, not individual anatomical layers or measured activation.
export const regionIds = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'lowerBack', 'glutes', 'quads', 'hamstrings', 'adductors', 'abductors', 'calves'] as const
export type MuscleRegion = typeof regionIds[number]
type Mapping = { regions: MuscleRegion[]; approximate?: boolean; nonMuscular?: boolean }
const aliases: Record<string, Mapping> = {}
const register = (names: string[], regions: MuscleRegion[], approximate = false) => names.forEach(name => { aliases[normalize(name)] = { regions, approximate } })
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() }
register(['Peitoral maior', 'Peitoral', 'Peito'], ['chest'])
register(['Deltoides', 'Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior', 'Ombros', 'Estabilizadores dos ombros', 'Cintura escapular'], ['shoulders'], true)
register(['Bíceps', 'Bíceps braquial', 'Braquial'], ['biceps'], true)
register(['Tríceps', 'Tríceps braquial'], ['triceps'])
register(['Antebraços', 'Braquiorradial'], ['forearms'], true)
register(['Ancôneo'], ['triceps'], true)
register(['Reto abdominal', 'Abdominais', 'Abdômen'], ['abs'])
register(['Transverso do abdome'], ['abs'], true)
register(['Oblíquos'], ['abs'], true)
register(['Core'], ['abs', 'lowerBack'], true)
register(['Romboides', 'Trapézio', 'Trapézio superior', 'Trapézio posterior', 'Costas'], ['back'], true)
register(['Latíssimo do dorso', 'Dorsais'], ['back'], true)
register(['Lombar', 'Eretores da coluna'], ['lowerBack'], true)
register(['Glúteos', 'Glúteo máximo'], ['glutes'], true)
register(['Glúteo médio', 'Glúteo mínimo', 'Abdutores'], ['abductors'], true)
// Hip flexion is not abduction. Retain the legacy term without a false highlighted region.
register(['Flexores do quadril'], [], true)
register(['Quadríceps'], ['quads'])
register(['Adutores'], ['adductors'], true)
register(['Posteriores', 'Posteriores de coxa', 'Isquiotibiais'], ['hamstrings'])
register(['Panturrilhas', 'Gastrocnêmio', 'Sóleo'], ['calves'], true)
register(['Pernas'], ['quads', 'adductors', 'hamstrings', 'calves'], true)
for (const name of ['Sistema cardiorrespiratório', 'Mobilidade', 'Equilíbrio', 'Coordenação', 'Mobilidade da coluna']) aliases[normalize(name)] = { regions: [], nonMuscular: true }

export function muscleMapping(name: string): Mapping | undefined { return aliases[normalize(name)] }
export function regionRole(region: MuscleRegion, primary: string[], secondary: string[]): 'primary' | 'secondary' | 'neutral' {
  if (primary.some(name => muscleMapping(name)?.regions.includes(region))) return 'primary'
  return secondary.some(name => muscleMapping(name)?.regions.includes(region)) ? 'secondary' : 'neutral'
}
