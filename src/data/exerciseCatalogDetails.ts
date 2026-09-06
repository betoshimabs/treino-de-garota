import type { Exercise } from '../types'

type CatalogDetail = Pick<Exercise, 'media' | 'curation'>

type DetailOptions = {
  primary: string[]
  secondary?: string[]
  pattern: string
  source?: NonNullable<Exercise['curation']>['source']
}

const mediaUrl = (id: string, file: string) => `${import.meta.env.BASE_URL}exercise-media/${id}/${file}`

const exerciseApi = (recordId: string) => ({
  name: 'ExerciseAPI',
  recordId,
  url: `https://exercise-api.com/v1/exercises/${recordId}`,
  license: 'CC BY 4.0',
})

const technicalReference = (name: string, recordId: string, url: string) => ({
  name,
  recordId,
  url,
  license: 'Referência técnica pública; ilustração original Brabita',
})

const cardioReference = (recordId: string) => technicalReference(
  'Life Fitness — catálogo de cardio',
  recordId,
  'https://www.lifefitness.com/en-us/catalog/cardio',
)

const activityReference = (recordId: string) => technicalReference(
  'CDC — intensidade de atividade física',
  recordId,
  'https://www.cdc.gov/physical-activity-basics/measuring/index.html',
)

const detail = (id: string, label: string, options: DetailOptions): CatalogDetail => ({
  media: {
    posterSrc: mediaUrl(id, 'poster.webp'),
    motionSrc: mediaUrl(id, 'movimento.webp'),
    alt: `A personagem Brabita demonstra ${label}, alternando entre o início e a execução do movimento.`,
  },
  curation: {
    primaryMuscles: options.primary,
    secondaryMuscles: options.secondary ?? [],
    movementPattern: options.pattern,
    reviewStatus: 'em-revisao',
    source: options.source ?? exerciseApi(id.replaceAll('-', '_')),
  },
})

export const exerciseCatalogDetails: Record<string, CatalogDetail> = {
  'agachamento-livre': detail('agachamento-livre', 'o agachamento livre com barra', {
    primary: ['Quadríceps', 'Glúteos'], secondary: ['Adutores', 'Eretores da coluna'],
    pattern: 'Agachamento', source: exerciseApi('barbell_back_squat'),
  }),
  'leg-press': detail('leg-press', 'o leg press inclinado', {
    primary: ['Quadríceps', 'Glúteos'], secondary: ['Adutores'],
    pattern: 'Empurrar com as pernas', source: exerciseApi('leg_press'),
  }),
  'cadeira-extensora': detail('cadeira-extensora', 'a cadeira extensora', {
    primary: ['Quadríceps'], pattern: 'Extensão de joelhos',
    source: exerciseApi('leg_extension'),
  }),
  'mesa-flexora': detail('mesa-flexora', 'a flexão de joelhos deitada', {
    primary: ['Posteriores de coxa'], secondary: ['Gastrocnêmio'],
    pattern: 'Flexão de joelhos', source: exerciseApi('lying_leg_curl'),
  }),
  'cadeira-flexora': detail('cadeira-flexora', 'a flexão de joelhos sentada', {
    primary: ['Posteriores de coxa'], secondary: ['Gastrocnêmio'],
    pattern: 'Flexão de joelhos', source: exerciseApi('seated_leg_curl'),
  }),
  stiff: detail('stiff', 'o levantamento terra romeno', {
    primary: ['Posteriores de coxa', 'Glúteos'], secondary: ['Eretores da coluna'],
    pattern: 'Dobradiça de quadril', source: exerciseApi('romanian_deadlift'),
  }),
  'elevacao-pelvica': detail('elevacao-pelvica', 'a elevação pélvica com barra', {
    primary: ['Glúteo máximo'], secondary: ['Posteriores de coxa', 'Adutores'],
    pattern: 'Extensão de quadril', source: exerciseApi('barbell_hip_thrust'),
  }),
  'gluteo-cabo': detail('gluteo-cabo', 'a extensão de quadril no cabo', {
    primary: ['Glúteo máximo'], secondary: ['Posteriores de coxa'],
    pattern: 'Extensão de quadril unilateral', source: technicalReference('ACE — Hip Extension', 'standing-hip-extension', 'https://contentcdn.eacefitness.com/cp/pdfs/CertifiedNews/AugSept09Cert.pdf'),
  }),
  'cadeira-abdutora': detail('cadeira-abdutora', 'a abdução de quadril sentada', {
    primary: ['Glúteo médio', 'Glúteo mínimo'], secondary: ['Glúteo máximo'],
    pattern: 'Abdução de quadril', source: technicalReference('Life Fitness — manual Insignia', 'SS-HAB', 'https://support.lifefitness.com/hc/en-us/articles/360043013933-Life-Fitness-Insignia-Series-Strength-Owner-s-Manual'),
  }),
  afundo: detail('afundo', 'o afundo reverso', {
    primary: ['Quadríceps', 'Glúteo máximo'], secondary: ['Posteriores de coxa', 'Adutores'],
    pattern: 'Agachamento unilateral', source: exerciseApi('reverse_lunge'),
  }),
  'panturrilha-em-pe': detail('panturrilha-em-pe', 'a panturrilha em pé na máquina', {
    primary: ['Gastrocnêmio'], secondary: ['Sóleo'],
    pattern: 'Flexão plantar', source: exerciseApi('standing_calf_raise'),
  }),
  'supino-reto': detail('supino-reto', 'o supino reto com barra', {
    primary: ['Peitoral maior'], secondary: ['Tríceps', 'Deltoide anterior'],
    pattern: 'Empurrar horizontal', source: exerciseApi('barbell_bench_press'),
  }),
  'supino-halteres': detail('supino-halteres', 'o supino reto com halteres', {
    primary: ['Peitoral maior'], secondary: ['Tríceps', 'Deltoide anterior'],
    pattern: 'Empurrar horizontal', source: exerciseApi('dumbbell_bench_press'),
  }),
  'crucifixo-maquina': detail('crucifixo-maquina', 'o crucifixo na máquina', {
    primary: ['Peitoral maior'], secondary: ['Deltoide anterior'],
    pattern: 'Adução horizontal dos ombros', source: exerciseApi('pec_deck_fly'),
  }),
  'puxada-frente': detail('puxada-frente', 'a puxada pela frente', {
    primary: ['Latíssimo do dorso'], secondary: ['Bíceps', 'Romboides', 'Trapézio'],
    pattern: 'Puxar vertical', source: exerciseApi('lat_pulldown'),
  }),
  'remada-baixa': detail('remada-baixa', 'a remada baixa no cabo', {
    primary: ['Latíssimo do dorso', 'Romboides'], secondary: ['Bíceps', 'Trapézio posterior'],
    pattern: 'Puxar horizontal', source: exerciseApi('seated_cable_row'),
  }),
  'remada-unilateral': detail('remada-unilateral', 'a remada unilateral com halter', {
    primary: ['Latíssimo do dorso'], secondary: ['Romboides', 'Bíceps', 'Deltoide posterior'],
    pattern: 'Puxar horizontal unilateral', source: exerciseApi('single_arm_dumbbell_row'),
  }),
  desenvolvimento: detail('desenvolvimento', 'o desenvolvimento sentado com halteres', {
    primary: ['Deltoides'], secondary: ['Tríceps', 'Trapézio superior'],
    pattern: 'Empurrar vertical', source: exerciseApi('seated_dumbbell_press'),
  }),
  'elevacao-lateral': detail('elevacao-lateral', 'a elevação lateral com halteres', {
    primary: ['Deltoide lateral'], secondary: ['Trapézio superior'],
    pattern: 'Abdução dos ombros', source: exerciseApi('dumbbell_lateral_raise'),
  }),
  'rosca-direta': detail('rosca-direta', 'a rosca direta com barra', {
    primary: ['Bíceps braquial'], secondary: ['Braquial', 'Braquiorradial'],
    pattern: 'Flexão de cotovelos', source: technicalReference('NASM — Barbell Bicep Curl', 'barbell-bicep-curl', 'https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl'),
  }),
  'rosca-martelo': detail('rosca-martelo', 'a rosca martelo com halteres', {
    primary: ['Braquial', 'Braquiorradial'], secondary: ['Bíceps braquial'],
    pattern: 'Flexão de cotovelos com pegada neutra', source: exerciseApi('dumbbell_hammer_curl'),
  }),
  'triceps-corda': detail('triceps-corda', 'o tríceps na corda', {
    primary: ['Tríceps braquial'], secondary: ['Ancôneo'],
    pattern: 'Extensão de cotovelos', source: exerciseApi('cable_triceps_pushdown'),
  }),
  'triceps-frances': detail('triceps-frances', 'o tríceps francês sentado', {
    primary: ['Tríceps braquial'], secondary: ['Estabilizadores dos ombros'],
    pattern: 'Extensão de cotovelos acima da cabeça',
    source: exerciseApi('dumbbell_overhead_extension'),
  }),
  'abdominal-prancha': detail('abdominal-prancha', 'a prancha sobre os antebraços', {
    primary: ['Reto abdominal', 'Transverso do abdome'], secondary: ['Oblíquos', 'Glúteos', 'Cintura escapular'],
    pattern: 'Anti-extensão do tronco', source: exerciseApi('plank'),
  }),
  'abdominal-crunch': detail('abdominal-crunch', 'o abdominal curto', {
    primary: ['Reto abdominal'], secondary: ['Oblíquos'],
    pattern: 'Flexão controlada do tronco', source: technicalReference('ACE — Crunch', 'crunch', 'https://www.acefitness.org/resources/everyone/exercise-library/52/crunch/'),
  }),
  esteira: detail('esteira', 'a caminhada na esteira', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas'],
    pattern: 'Locomoção — caminhada', source: cardioReference('treadmill_walking'),
  }),
  'corrida-esteira': detail('corrida-esteira', 'a corrida na esteira', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas'],
    pattern: 'Locomoção — corrida', source: cardioReference('treadmill_running'),
  }),
  'caminhada-rua': detail('caminhada-rua', 'a caminhada ao ar livre', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas'],
    pattern: 'Locomoção — caminhada', source: activityReference('outdoor_walking'),
  }),
  'corrida-rua': detail('corrida-rua', 'a corrida ao ar livre', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas'],
    pattern: 'Locomoção — corrida', source: activityReference('outdoor_running'),
  }),
  bicicleta: detail('bicicleta', 'a bicicleta ergométrica', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas'],
    pattern: 'Pedalada cíclica', source: cardioReference('upright_stationary_bike'),
  }),
  eliptico: detail('eliptico', 'o exercício no elíptico', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas', 'Cintura escapular'],
    pattern: 'Passada elíptica', source: cardioReference('elliptical_trainer'),
  }),
  escada: detail('escada', 'o simulador de escada', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Quadríceps', 'Glúteos', 'Panturrilhas'],
    pattern: 'Subida de degraus', source: cardioReference('rotating_stair_climber'),
  }),
  natacao: detail('natacao', 'uma fase representativa do nado livre', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Latíssimo do dorso', 'Deltoides', 'Core', 'Pernas'],
    pattern: 'Nado cíclico',
    source: technicalReference('USA Swimming — desenvolvimento técnico', 'freestyle_swimming', 'https://www.usaswimming.org/coaches-leaders/coaches/american-development-model'),
  }),
  danca: detail('danca', 'um passo representativo de dança livre', {
    primary: ['Sistema cardiorrespiratório'], secondary: ['Pernas', 'Core', 'Coordenação'],
    pattern: 'Movimento rítmico multidirecional', source: activityReference('dance'),
  }),
  yoga: detail('yoga', 'uma transição representativa de yoga entre Montanha e Guerreiro II', {
    primary: ['Mobilidade', 'Equilíbrio'], secondary: ['Pernas', 'Core', 'Cintura escapular'],
    pattern: 'Fluxo postural',
    source: technicalReference('ACE Exercise Library', 'yoga_representative_flow', 'https://www.acefitness.org/resources/everyone/exercise-library/'),
  }),
  pilates: detail('pilates', 'uma ponte de ombros representativa do Pilates no solo', {
    primary: ['Core', 'Glúteos'], secondary: ['Posteriores de coxa', 'Mobilidade da coluna'],
    pattern: 'Articulação da coluna e extensão de quadril',
    source: technicalReference('ACE Exercise Library', 'mat_pilates_shoulder_bridge', 'https://www.acefitness.org/resources/everyone/exercise-library/'),
  }),
  mobilidade: detail('mobilidade', 'um fluxo representativo de mobilidade em meio-ajoelhado', {
    primary: ['Flexores do quadril'], secondary: ['Core', 'Cintura escapular'],
    pattern: 'Mobilidade de quadril com alcance',
    source: technicalReference('ACE Exercise Library', 'half_kneeling_hip_mobility', 'https://www.acefitness.org/resources/everyone/exercise-library/'),
  }),
}
