// Region-level schematic, not individual anatomical layers or measured activation.
export const regionIds = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'upperBack', 'lats', 'lowerBack', 'glutes', 'hips', 'quads', 'adductors', 'hamstrings', 'calves'] as const
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
register(['Ancôneo'], ['forearms'], true)
register(['Reto abdominal', 'Abdominais'], ['abs'])
register(['Transverso do abdome'], ['abs'], true)
register(['Oblíquos'], ['obliques'])
register(['Core'], ['abs', 'obliques', 'lowerBack'], true)
register(['Romboides', 'Trapézio', 'Trapézio superior', 'Trapézio posterior', 'Costas'], ['upperBack'], true)
register(['Latíssimo do dorso', 'Dorsais'], ['lats'])
register(['Lombar', 'Eretores da coluna'], ['lowerBack'], true)
register(['Glúteos', 'Glúteo máximo'], ['glutes'], true)
register(['Glúteo médio', 'Glúteo mínimo', 'Abdutores', 'Flexores do quadril'], ['hips'], true)
register(['Quadríceps'], ['quads'])
register(['Adutores'], ['adductors'], true)
register(['Posteriores de coxa', 'Isquiotibiais'], ['hamstrings'])
register(['Panturrilhas', 'Gastrocnêmio', 'Sóleo'], ['calves'], true)
register(['Pernas'], ['quads', 'adductors', 'hamstrings', 'calves'], true)
for (const name of ['Sistema cardiorrespiratório', 'Mobilidade', 'Equilíbrio', 'Coordenação', 'Mobilidade da coluna']) aliases[normalize(name)] = { regions: [], nonMuscular: true }

export function muscleMapping(name: string): Mapping | undefined { return aliases[normalize(name)] }
export function regionRole(region: MuscleRegion, primary: string[], secondary: string[]): 'primary' | 'secondary' | 'neutral' {
  if (primary.some(name => muscleMapping(name)?.regions.includes(region))) return 'primary'
  return secondary.some(name => muscleMapping(name)?.regions.includes(region)) ? 'secondary' : 'neutral'
}
