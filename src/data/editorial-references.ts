import type { ExerciseEditorial } from '../types'

type Reference = ExerciseEditorial['references'][number]
const ref = (name: string, url: string): Reference => ({ name, url })
const nasm = (slug: string) => ref('NASM — biblioteca técnica', `https://www.nasm.org/resource-center/exercise-library/${slug}`)
const machines = ref('Life Fitness — ajustes e operação Insignia', 'https://support.lifefitness.com/hc/en-us/articles/360043013933-Life-Fitness-Insignia-Series-Strength-Owner-s-Manual')
const fundamentals = ref('NSCA — fundamentos de força e condicionamento', 'https://www.nsca.com/contentassets/116c55d64e1343d2b264e05aaf158a91/basics_of_strength_and_conditioning_manual.pdf')
const perception = ref('CDC — intensidade percebida da atividade', 'https://www.cdc.gov/physical-activity-basics/measuring/index.html')
const core = ref('ACE — controle e progressão do core', 'https://www.acefitness.org/continuing-education/certified/august-2023/8401/building-the-body-s-foundation-how-to-safely-progress-core-training/')

/** Public attribution only. Research notes and media prompts are kept outside the build. */
export const editorialReferences: Record<string, Reference[]> = {
  'agachamento-livre': [fundamentals], 'leg-press': [machines], 'cadeira-extensora': [machines], 'cadeira-flexora': [machines], 'mesa-flexora': [machines],
  stiff: [ref('NSCA — Romanian Deadlift', 'https://www.nsca.com/education/articles/kinetic-select/romanian-deadlift-rdl/')],
  'elevacao-pelvica': [fundamentals], 'gluteo-cabo': [fundamentals], 'cadeira-abdutora': [machines], afundo: [fundamentals], 'panturrilha-em-pe': [fundamentals],
  'supino-reto': [fundamentals], 'supino-halteres': [fundamentals], 'crucifixo-maquina': [machines], 'puxada-frente': [fundamentals],
  'remada-baixa': [ref('ACE — Seated Row', 'https://www.acefitness.org/resources/everyone/exercise-library/48/seated-row/')],
  'remada-unilateral': [fundamentals], desenvolvimento: [fundamentals], 'elevacao-lateral': [fundamentals], 'rosca-direta': [fundamentals], 'rosca-martelo': [fundamentals], 'triceps-corda': [fundamentals], 'triceps-frances': [fundamentals],
  'abdominal-prancha': [core], 'abdominal-crunch': [core],
  'agachamento-goblet': [ref('NASM — Goblet Squat', 'https://www.nasm.org/resource-center/blog/training/how-to-perform-goblet-squats')],
  'agachamento-bulgaro': [nasm('bulgarian-split-squat')],
  'terra-convencional': [ref('NSCA — técnica do levantamento terra', 'https://www.nsca.com/education/videos/exercise-technique-deadlift/')],
  'cadeira-adutora': [machines],
  'panturrilha-sentada': [ref('Body-Solid — Seated Calf Raise de assento fixo', 'https://bodysolid.com/body-solid-seated-calf-raise')],
  'supino-inclinado-halteres': [nasm('two-arm-incline-dumbbell-chest-press')],
  'barra-fixa-assistida': [ref('Life Fitness — Assist Dip Chin', 'https://www.lifefitness.com/en-gb/catalog/strength-training/selectorized/insignia-series-assist-dip-chin')],
  'face-pull': [nasm('face-pull')], 'flexao-bracos': [fundamentals], 'prancha-lateral': [core], 'dead-bug': [core],
  'remo-ergometro': [ref('Texas DPS — sequência no remo Concept2', 'https://www.dps.texas.gov/section/training-operations-tod/concept-2-rower-evaluation-and-rowing-workouts')],
  ciclismo: [perception], esteira: [perception], 'corrida-esteira': [perception], 'caminhada-rua': [perception], 'corrida-rua': [perception], bicicleta: [perception], eliptico: [perception], escada: [perception], natacao: [perception], danca: [perception], yoga: [perception], pilates: [core], mobilidade: [core],
}
