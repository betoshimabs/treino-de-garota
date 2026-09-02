import type { Exercise } from '../types'

const makeExercise = (
  id: string,
  name: string,
  aliases: string[],
  group: string,
  equipment: string,
  instructions: string[],
): Exercise => ({ id, name, aliases, group, equipment, instructions, origin: 'system' })

export const exercises: Exercise[] = [
  makeExercise('agachamento-livre', 'Agachamento livre', ['agachamento', 'squat'], 'Pernas', 'Barra', ['Apoie a barra com conforto.', 'Desça mantendo os pés firmes.', 'Suba sem perder o alinhamento dos joelhos.']),
  makeExercise('leg-press', 'Leg press', ['leg 45', 'prensa'], 'Pernas', 'Máquina', ['Apoie toda a lombar.', 'Desça até onde mantém o quadril estável.', 'Empurre sem travar os joelhos.']),
  makeExercise('cadeira-extensora', 'Cadeira extensora', ['extensora'], 'Pernas', 'Máquina', ['Ajuste o eixo à altura do joelho.', 'Estenda de forma controlada.', 'Retorne sem soltar o peso.']),
  makeExercise('mesa-flexora', 'Mesa flexora', ['flexora deitada'], 'Posterior', 'Máquina', ['Mantenha o quadril apoiado.', 'Flexione sem tirar o corpo do banco.', 'Controle a volta.']),
  makeExercise('cadeira-flexora', 'Cadeira flexora', ['flexora sentada'], 'Posterior', 'Máquina', ['Ajuste o encosto e a almofada.', 'Puxe os calcanhares para baixo.', 'Volte devagar.']),
  makeExercise('stiff', 'Stiff', ['levantamento romeno', 'rdl'], 'Posterior', 'Barra', ['Mantenha a carga perto das pernas.', 'Leve o quadril para trás.', 'Pare antes de arredondar a lombar.']),
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
  makeExercise('abdominal-prancha', 'Prancha', ['prancha abdominal'], 'Core', 'Peso corporal', ['Apoie antebraços e pés.', 'Mantenha quadril e ombros alinhados.', 'Respire sem perder a posição.']),
  makeExercise('abdominal-crunch', 'Abdominal curto', ['crunch'], 'Core', 'Peso corporal', ['Mantenha a lombar confortável.', 'Eleve as escápulas sem puxar o pescoço.', 'Desça devagar.']),
  makeExercise('esteira', 'Caminhada na esteira', ['esteira', 'caminhada'], 'Cardio', 'Máquina', ['Escolha uma velocidade confortável.', 'Mantenha a passada natural.', 'Reduza o ritmo antes de parar.']),
  makeExercise('bicicleta', 'Bicicleta ergométrica', ['bike', 'bicicleta'], 'Cardio', 'Máquina', ['Ajuste o banco.', 'Pedale sem travar os joelhos.', 'Mantenha um ritmo confortável.']),
]

export const exerciseGroups = ['Todos', ...Array.from(new Set(exercises.map((item) => item.group)))]
