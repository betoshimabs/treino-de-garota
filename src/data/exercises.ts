import type { Exercise } from '../types'
import { exerciseCatalogDetails } from './exerciseCatalogDetails'

const makeExercise = (
  id: string,
  name: string,
  aliases: string[],
  group: string,
  equipment: string,
  instructions: string[],
  options: Partial<Pick<Exercise, 'category' | 'metricMode' | 'visual' | 'media' | 'curation'>> = {},
): Exercise => ({
  id,
  name,
  aliases,
  group,
  equipment,
  instructions,
  origin: 'system',
  category: options.category ?? 'strength',
  metricMode: options.metricMode ?? 'load-reps',
  visual: options.visual ?? visualFor(id),
  media: options.media ?? exerciseCatalogDetails[id]?.media,
  curation: options.curation ?? exerciseCatalogDetails[id]?.curation,
})

const exerciseMediaUrl = (path: string) => `${import.meta.env.BASE_URL}exercise-media/${path}`

function visualFor(id: string): Exercise['visual'] {
  if (/agachamento|leg-press|extensora|flexora|abdutora|panturrilha/.test(id)) return 'squat'
  if (/stiff/.test(id)) return 'hinge'
  if (/pelvica|gluteo/.test(id)) return 'bridge'
  if (/afundo/.test(id)) return 'lunge'
  if (/supino|crucifixo|desenvolvimento|triceps/.test(id)) return 'press'
  if (/puxada|remada/.test(id)) return 'pull'
  if (/elevacao-lateral/.test(id)) return 'raise'
  if (/rosca/.test(id)) return 'curl'
  if (/prancha|crunch/.test(id)) return 'plank'
  return 'flow'
}

export const exercises: Exercise[] = [
  makeExercise('agachamento-livre', 'Agachamento livre', ['agachamento', 'squat', 'barbell back squat'], 'Pernas', 'Barra', ['Prepare o tronco e apoie a barra na parte alta das costas.', 'Desça entre os quadris mantendo os pés inteiros apoiados.', 'Suba mantendo os joelhos na mesma direção dos pés.'], {
    media: {
      posterSrc: exerciseMediaUrl('agachamento-livre/poster.webp'),
      motionSrc: exerciseMediaUrl('agachamento-livre/movimento.webp'),
      alt: 'A personagem demonstra o agachamento com barra, alternando entre a posição em pé e a posição baixa.',
    },
    curation: {
      primaryMuscles: ['Quadríceps'],
      secondaryMuscles: ['Glúteos', 'Posteriores de coxa', 'Lombar'],
      movementPattern: 'Agachamento',
      stimulusToFatigue: 'moderado',
      suggestedRepRange: { minimum: 6, maximum: 10 },
      reviewStatus: 'em-revisao',
      source: {
        name: 'ExerciseAPI',
        recordId: 'barbell_back_squat',
        url: 'https://exercise-api.com/v1/exercises/barbell_back_squat',
        license: 'CC BY 4.0',
      },
    },
  }),
  makeExercise('leg-press', 'Leg press', ['leg 45', 'prensa'], 'Pernas', 'Máquina', ['Apoie toda a lombar.', 'Desça até onde mantém o quadril estável.', 'Empurre sem travar os joelhos.'], {
    media: {
      posterSrc: exerciseMediaUrl('leg-press/poster.webp'),
      motionSrc: exerciseMediaUrl('leg-press/movimento.webp'),
      alt: 'A personagem demonstra o leg press inclinado, alternando entre a posição flexionada e a extensão confortável das pernas.',
    },
    curation: {
      primaryMuscles: ['Quadríceps'],
      secondaryMuscles: ['Glúteos', 'Posteriores de coxa'],
      movementPattern: 'Empurrar com as pernas',
      stimulusToFatigue: 'moderado',
      suggestedRepRange: { minimum: 8, maximum: 12 },
      reviewStatus: 'em-revisao',
      source: {
        name: 'ExerciseAPI',
        recordId: 'leg_press',
        url: 'https://exercise-api.com/v1/exercises/leg_press',
        license: 'CC BY 4.0',
      },
    },
  }),
  makeExercise('cadeira-extensora', 'Cadeira extensora', ['extensora'], 'Pernas', 'Máquina', ['Ajuste o eixo à altura do joelho.', 'Estenda de forma controlada.', 'Retorne sem soltar o peso.']),
  makeExercise('mesa-flexora', 'Mesa flexora', ['flexora deitada'], 'Posterior', 'Máquina', ['Mantenha o quadril apoiado.', 'Flexione sem tirar o corpo do banco.', 'Controle a volta.']),
  makeExercise('cadeira-flexora', 'Cadeira flexora', ['flexora sentada'], 'Posterior', 'Máquina', ['Ajuste o encosto e a almofada.', 'Puxe os calcanhares para baixo.', 'Volte devagar.']),
  makeExercise('stiff', 'Stiff', ['levantamento romeno', 'rdl'], 'Posterior', 'Barra', ['Mantenha a carga perto das pernas.', 'Leve o quadril para trás.', 'Pare antes de arredondar a lombar.'], {
    media: {
      posterSrc: exerciseMediaUrl('stiff/poster.webp'),
      motionSrc: exerciseMediaUrl('stiff/movimento.webp'),
      alt: 'A personagem demonstra o levantamento terra romeno, alternando entre a posição em pé e a inclinação do tronco com a barra próxima às pernas.',
    },
    curation: {
      primaryMuscles: ['Posteriores de coxa'],
      secondaryMuscles: ['Glúteos', 'Eretores da coluna'],
      movementPattern: 'Dobradiça de quadril',
      stimulusToFatigue: 'moderado',
      suggestedRepRange: { minimum: 6, maximum: 10 },
      reviewStatus: 'em-revisao',
      source: {
        name: 'ExerciseAPI',
        recordId: 'romanian_deadlift',
        url: 'https://exercise-api.com/v1/exercises/romanian_deadlift',
        license: 'CC BY 4.0',
      },
    },
  }),
  makeExercise('elevacao-pelvica', 'Elevação pélvica', ['hip thrust', 'ponte'], 'Glúteos', 'Barra', ['Apoie as escápulas no banco.', 'Eleve o quadril mantendo o abdômen firme.', 'Pause no topo sem hiperestender a lombar.']),
  makeExercise('gluteo-cabo', 'Glúteo no cabo', ['coice', 'kickback'], 'Glúteos', 'Cabo', ['Estabilize o tronco.', 'Leve a perna para trás sem girar o quadril.', 'Retorne com controle.']),
  makeExercise('cadeira-abdutora', 'Cadeira abdutora', ['abdutora'], 'Glúteos', 'Máquina', ['Mantenha os pés apoiados.', 'Abra os joelhos de forma controlada.', 'Evite impulsionar o tronco.']),
  makeExercise('afundo', 'Afundo', ['passada', 'lunge'], 'Pernas', 'Halteres', ['Dê um passo estável.', 'Desça os dois joelhos com controle.', 'Empurre o chão para retornar.']),
  makeExercise('panturrilha-em-pe', 'Panturrilha em pé', ['gemeos em pé'], 'Panturrilhas', 'Máquina', ['Apoie a parte da frente dos pés.', 'Suba até a contração confortável.', 'Desça devagar.']),
  makeExercise('supino-reto', 'Supino reto', ['bench press'], 'Peito', 'Barra', ['Apoie pés e escápulas.', 'Desça a barra com controle.', 'Empurre mantendo os punhos firmes.']),
  makeExercise('supino-halteres', 'Supino com halteres', ['supino reto halteres'], 'Peito', 'Halteres', ['Apoie bem as costas.', 'Desça os halteres com controle.', 'Una o movimento sem bater os pesos.']),
  makeExercise('crucifixo-maquina', 'Crucifixo na máquina', ['peck deck', 'voador'], 'Peito', 'Máquina', ['Ajuste o banco à altura dos ombros.', 'Feche os braços sem encolher os ombros.', 'Retorne de forma lenta.']),
  makeExercise('puxada-frente', 'Puxada pela frente', ['pulley frente', 'lat pulldown'], 'Costas', 'Cabo', ['Mantenha o peito aberto.', 'Puxe em direção à parte alta do peito.', 'Evite jogar o tronco para trás.']),
  makeExercise('remada-baixa', 'Remada baixa', ['remada sentada'], 'Costas', 'Cabo', ['Sente com a coluna estável.', 'Puxe os cotovelos para trás.', 'Retorne sem arredondar o tronco.']),
  makeExercise('remada-unilateral', 'Remada unilateral', ['serrote'], 'Costas', 'Halter', ['Apoie o corpo com estabilidade.', 'Puxe o cotovelo perto do tronco.', 'Evite girar o quadril.']),
  makeExercise('desenvolvimento', 'Desenvolvimento com halteres', ['shoulder press'], 'Ombros', 'Halteres', ['Sente com apoio.', 'Empurre acima da cabeça sem arquear a lombar.', 'Desça até uma amplitude confortável.']),
  makeExercise('elevacao-lateral', 'Elevação lateral', ['lateral'], 'Ombros', 'Halteres', ['Mantenha cotovelos levemente flexionados.', 'Eleve sem encolher os ombros.', 'Controle a descida.']),
  makeExercise('rosca-direta', 'Rosca direta', ['bíceps barra'], 'Braços', 'Barra', ['Mantenha os cotovelos próximos ao corpo.', 'Flexione sem balançar o tronco.', 'Desça de forma controlada.']),
  makeExercise('rosca-martelo', 'Rosca martelo', ['martelo'], 'Braços', 'Halteres', ['Segure com as palmas voltadas entre si.', 'Mantenha os cotovelos estáveis.', 'Controle a volta.']),
  makeExercise('triceps-corda', 'Tríceps na corda', ['tríceps pulley'], 'Braços', 'Cabo', ['Fixe os cotovelos ao lado do corpo.', 'Estenda os braços sem mover os ombros.', 'Retorne com controle.']),
  makeExercise('triceps-frances', 'Tríceps francês', ['tríceps acima da cabeça'], 'Braços', 'Halter', ['Mantenha o abdômen firme.', 'Dobre os cotovelos atrás da cabeça.', 'Estenda sem abrir demais os braços.']),
  makeExercise('abdominal-prancha', 'Prancha', ['prancha abdominal'], 'Core', 'Peso corporal', ['Apoie antebraços e pés.', 'Mantenha quadril e ombros alinhados.', 'Respire sem perder a posição.'], { metricMode: 'time-only', visual: 'plank' }),
  makeExercise('abdominal-crunch', 'Abdominal curto', ['crunch'], 'Core', 'Peso corporal', ['Mantenha a lombar confortável.', 'Eleve as escápulas sem puxar o pescoço.', 'Desça devagar.'], { metricMode: 'reps-only', visual: 'plank' }),
  makeExercise('esteira', 'Caminhada na esteira', ['esteira', 'caminhada'], 'Cardio', 'Esteira', ['Escolha uma velocidade confortável.', 'Mantenha a passada natural.', 'Reduza o ritmo antes de parar.'], { category: 'cardio', metricMode: 'distance-time', visual: 'walk' }),
  makeExercise('corrida-esteira', 'Corrida na esteira', ['corrida', 'esteira corrida'], 'Cardio', 'Esteira', ['Aqueça antes de acelerar.', 'Mantenha uma passada confortável.', 'Reduza o ritmo de forma gradual.'], { category: 'cardio', metricMode: 'distance-time', visual: 'walk' }),
  makeExercise('caminhada-rua', 'Caminhada ao ar livre', ['caminhada rua'], 'Cardio', 'Sem equipamento', ['Escolha um percurso seguro.', 'Mantenha um ritmo confortável.', 'Registre distância e tempo ao terminar.'], { category: 'cardio', metricMode: 'distance-time', visual: 'walk' }),
  makeExercise('corrida-rua', 'Corrida ao ar livre', ['corrida rua'], 'Cardio', 'Sem equipamento', ['Escolha um percurso seguro.', 'Ajuste o ritmo às condições do dia.', 'Registre distância e tempo ao terminar.'], { category: 'cardio', metricMode: 'distance-time', visual: 'walk' }),
  makeExercise('bicicleta', 'Bicicleta ergométrica', ['bike', 'bicicleta'], 'Cardio', 'Máquina', ['Ajuste o banco.', 'Pedale sem travar os joelhos.', 'Mantenha um ritmo confortável.'], { category: 'cardio', metricMode: 'distance-time', visual: 'cycle' }),
  makeExercise('eliptico', 'Elíptico', ['transport', 'cross trainer'], 'Cardio', 'Máquina', ['Ajuste a resistência.', 'Mantenha os pés apoiados.', 'Registre o tempo ao terminar.'], { category: 'cardio', metricMode: 'time-only', visual: 'walk' }),
  makeExercise('escada', 'Simulador de escada', ['escada', 'stair'], 'Cardio', 'Máquina', ['Comece em ritmo confortável.', 'Apoie as mãos apenas para equilíbrio.', 'Registre o tempo ao terminar.'], { category: 'cardio', metricMode: 'time-only', visual: 'walk' }),
  makeExercise('natacao', 'Natação', ['nadar', 'piscina'], 'Cardio', 'Piscina', ['Escolha o estilo e ritmo do dia.', 'Conte a distância quando possível.', 'Registre distância e tempo ao terminar.'], { category: 'cardio', metricMode: 'distance-time', visual: 'flow' }),
  makeExercise('danca', 'Dança', ['aula de dança'], 'Outras', 'Livre', ['Escolha a modalidade.', 'Registre o tempo total da atividade.', 'Use a observação para guardar detalhes.'], { category: 'other', metricMode: 'time-only', visual: 'flow' }),
  makeExercise('yoga', 'Yoga', ['ioga'], 'Outras', 'Tapete', ['Registre o tempo da prática.', 'Use a observação para anotar a sequência.', 'Respeite sua amplitude confortável.'], { category: 'other', metricMode: 'time-only', visual: 'flow' }),
  makeExercise('pilates', 'Pilates', [], 'Outras', 'Variado', ['Registre o tempo da sessão.', 'Use a observação para anotar o foco.', 'Siga a orientação da aula ou profissional.'], { category: 'other', metricMode: 'time-only', visual: 'flow' }),
  makeExercise('mobilidade', 'Mobilidade', ['alongamento', 'mobilidade articular'], 'Outras', 'Livre', ['Escolha as regiões trabalhadas.', 'Registre o tempo total.', 'Anote movimentos importantes se quiser.'], { category: 'other', metricMode: 'time-only', visual: 'flow' }),
]

export const exerciseGroups = ['Todos', ...Array.from(new Set(exercises.map((item) => item.group)))]
