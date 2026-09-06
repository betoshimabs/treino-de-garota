import type { Exercise, ExerciseAnalysis, ExperienceLevel, LoadConvention, MuscleRegionId, TrainingFocus } from '../types'
import { muscleMapping } from '../muscle-map'
import { editorialReferences } from './editorial-references'

export const CATALOG_VERSION = '2026-09-06.1'
type Review = { analysis: ExerciseAnalysis; setup: string; care: string; name?: string }
const review = (focus: TrainingFocus, familiarity: ExperienceLevel, loadConvention: LoadConvention,
  primaryRegions: MuscleRegionId[], secondaryRegions: MuscleRegionId[], setup: string, care: string,
  repetitions: ExerciseAnalysis['repetitions'] = 'bilateral', name?: string): Review => ({
  analysis: { version: CATALOG_VERSION, kind: focus === 'Cardio' || focus === 'Prática livre' ? 'session' : 'movement', focus, familiarity, loadConvention, primaryRegions, secondaryRegions, repetitions }, setup, care, name,
})

/** Editorial classifications describe this exact variant, never the person's capacity or recovery. */
export const catalogReview: Record<string, Review> = {
  'agachamento-livre': review('Inferiores', 'Intermediário', 'total', ['quads', 'glutes'], ['adductors', 'lowerBack'], 'Use rack com travas de segurança ajustadas e barra apoiada na musculatura das costas, não no pescoço.', 'A profundidade depende do controle e da mobilidade; mantenha apoio dos pés e não force uma amplitude dolorosa.', 'bilateral', 'Agachamento com barra'),
  'leg-press': review('Inferiores', 'Iniciante', 'machine', ['quads', 'glutes'], ['adductors'], 'Ajuste encosto e travas do leg press inclinado a 45°. Mantenha quadril e costas no apoio.', 'Interrompa a descida antes de perder o apoio da pelve. A carga de máquinas diferentes não é diretamente comparável.', 'bilateral', 'Leg press 45°'),
  'cadeira-extensora': review('Inferiores', 'Iniciante', 'machine', ['quads'], [], 'Alinhe o eixo da máquina ao joelho e posicione o rolo na parte inferior da canela, acima do tornozelo.', 'Mantenha costas e coxas apoiadas. Não use impulso nem deixe as placas baterem.'),
  'mesa-flexora': review('Inferiores', 'Iniciante', 'machine', ['hamstrings'], ['calves'], 'Deite de barriga para baixo; alinhe joelhos ao eixo e coloque o rolo acima dos calcanhares.', 'Evite levantar a pelve ou arquear a lombar para aumentar a amplitude.'),
  'cadeira-flexora': review('Inferiores', 'Iniciante', 'machine', ['hamstrings'], ['calves'], 'Ajuste encosto, eixo dos joelhos, rolo inferior e apoio das coxas antes de começar.', 'Mantenha o quadril no assento durante a flexão e a volta.'),
  stiff: review('Inferiores', 'Intermediário', 'total', ['hamstrings', 'glutes'], ['lowerBack'], 'Comece em pé com barra nas mãos e joelhos ligeiramente flexionados; leve o quadril para trás.', 'Esta ficha é do terra romeno, não do terra com joelhos rígidos. A barra não precisa tocar o chão.', 'bilateral', 'Terra romeno com barra'),
  'elevacao-pelvica': review('Inferiores', 'Intermediário', 'total', ['glutes'], ['hamstrings', 'adductors'], 'Estabilize o banco; apoie a parte alta das costas e proteja o contato da barra com o quadril.', 'Termine a subida pela extensão do quadril, sem jogar as costelas para cima ou hiperestender a lombar.', 'bilateral', 'Elevação pélvica com barra'),
  'gluteo-cabo': review('Inferiores', 'Iniciante', 'machine', ['glutes'], ['hamstrings'], 'Prenda a tornozeleira à polia baixa e segure o apoio fixo de frente para a máquina.', 'Leve a perna para trás sem girar a pelve. Reduza a carga se precisar balançar o tronco.', 'per-side'),
  'cadeira-abdutora': review('Inferiores', 'Iniciante', 'machine', ['hips'], ['glutes'], 'Use os apoios na parte externa das coxas e ajuste uma abertura inicial confortável.', 'Abra contra os apoios e retorne devagar. Não confunda com a cadeira adutora, que fecha as pernas.'),
  afundo: review('Inferiores', 'Intermediário', 'per-implement', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'Segure um halter em cada mão e dê o passo para trás, mantendo espaço lateral entre os pés.', 'O pé da frente permanece apoiado. Volte pelo trabalho da perna da frente, sem perder o equilíbrio.', 'per-side', 'Afundo reverso com halteres'),
  'panturrilha-em-pe': review('Inferiores', 'Iniciante', 'machine', ['calves'], [], 'Ajuste os apoios dos ombros e mantenha o antepé na plataforma com os calcanhares livres.', 'Suba e desça pelos tornozelos; evite quicar ou usar os joelhos como impulso.'),
  'supino-reto': review('Superiores', 'Intermediário', 'total', ['chest'], ['triceps', 'shoulders'], 'Ajuste suportes e travas; apoie cabeça, costas e pés. Peça ajuda para retirar ou devolver a barra quando necessário.', 'Não deixe a barra quicar no peito. Use travas de segurança ou auxílio adequado.', 'bilateral', 'Supino reto com barra'),
  'supino-halteres': review('Superiores', 'Iniciante', 'per-implement', ['chest'], ['triceps', 'shoulders'], 'Deite no banco plano com os pés estáveis e um halter em cada mão.', 'Mantenha punhos alinhados aos antebraços e controle também a entrada e a saída do banco.'),
  'crucifixo-maquina': review('Superiores', 'Iniciante', 'machine', ['chest'], ['shoulders'], 'Ajuste o assento para deixar as alças aproximadamente à altura do peito.', 'Respeite a amplitude confortável dos ombros; não force os braços muito para trás.'),
  'puxada-frente': review('Superiores', 'Iniciante', 'machine', ['lats'], ['biceps', 'upperBack'], 'Trave suavemente as coxas sob os apoios e segure a barra com as palmas para a frente.', 'Puxe pela frente, não atrás da nuca; mantenha o tronco estável.'),
  'remada-baixa': review('Superiores', 'Iniciante', 'machine', ['lats', 'upperBack'], ['biceps', 'shoulders'], 'Use o puxador de pegada neutra, pés nos apoios e joelhos ligeiramente flexionados.', 'Puxe em direção ao tronco sem embalar a lombar ou encolher os ombros.'),
  'remada-unilateral': review('Superiores', 'Intermediário', 'per-implement', ['lats', 'upperBack'], ['biceps', 'shoulders'], 'Apoie mão e joelho do mesmo lado no banco; o outro pé fica firme no chão.', 'Puxe o halter sem girar o tronco. Faça o registro de repetições por lado.', 'per-side'),
  desenvolvimento: review('Superiores', 'Iniciante', 'per-implement', ['shoulders'], ['triceps'], 'Ajuste um banco com encosto alto e mantenha os pés apoiados.', 'Evite compensar a subida arqueando a lombar; mantenha uma amplitude confortável dos ombros.'),
  'elevacao-lateral': review('Superiores', 'Iniciante', 'per-implement', ['shoulders'], ['upperBack'], 'Fique em pé com joelhos relaxados, halteres ao lado do corpo e cotovelos suavemente flexionados.', 'Eleve até uma altura confortável próxima à dos ombros; não jogue os pesos com o tronco.'),
  'rosca-direta': review('Superiores', 'Iniciante', 'total', ['biceps'], ['forearms'], 'Segure a barra com palmas para a frente e punhos alinhados.', 'Mantenha os cotovelos próximos do corpo e reduza a carga se precisar embalar.'),
  'rosca-martelo': review('Superiores', 'Iniciante', 'per-implement', ['biceps', 'forearms'], [], 'Segure os dois halteres com as palmas voltadas entre si.', 'Nesta variação os dois braços sobem juntos. Não alterne sem registrar a mudança na observação.'),
  'triceps-corda': review('Superiores', 'Iniciante', 'machine', ['triceps'], [], 'Fixe a corda na polia alta e mantenha os cotovelos próximos ao tronco.', 'Estenda os cotovelos sem usar o peso do corpo para empurrar a corda.'),
  'triceps-frances': review('Superiores', 'Intermediário', 'total', ['triceps'], [], 'Sente com apoio; as duas mãos seguram um único halter acima da cabeça.', 'Controle a descida atrás da cabeça e a retirada do halter; não force a posição dos ombros.'),
  'abdominal-prancha': review('Core', 'Iniciante', 'none', ['abs'], ['obliques', 'shoulders', 'glutes'], 'Apoie antebraços, com cotovelos sob os ombros, e pontas dos pés.', 'É uma sustentação, não uma repetição de subir e descer. Encerre quando não conseguir manter o alinhamento.', 'time', 'Prancha de antebraços'),
  'abdominal-crunch': review('Core', 'Iniciante', 'none', ['abs'], ['obliques'], 'Deite com joelhos flexionados e pés no chão; deixe as mãos apoiadas sem puxar a cabeça.', 'Eleve apenas a parte alta do tronco. Não transforme a execução em um abdominal completo sentado.'),
  'agachamento-goblet': review('Inferiores', 'Iniciante', 'total', ['quads', 'glutes'], ['adductors', 'abs'], 'Segure um único halter vertical junto ao peito, sustentando sua extremidade superior com as duas mãos.', 'Mantenha o peso perto do corpo e os pés apoiados; escolha a profundidade que consegue controlar.'),
  'agachamento-bulgaro': review('Inferiores', 'Avançado', 'per-implement', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'Use banco firme atrás do corpo, peito do pé traseiro apoiado e um halter em cada mão.', 'Exige familiaridade com equilíbrio unilateral. Ajuste a distância do pé da frente sem forçar o quadril traseiro.', 'per-side'),
  'terra-convencional': review('Inferiores', 'Avançado', 'total', ['glutes', 'quads', 'hamstrings'], ['lowerBack', 'upperBack', 'forearms'], 'Barra no chão sobre o meio dos pés; segure por fora das pernas e prepare o tronco antes de retirar a carga.', 'A barra permanece próxima do corpo. No topo, fique em pé sem inclinar a lombar para trás.'),
  'cadeira-adutora': review('Inferiores', 'Iniciante', 'machine', ['adductors'], [], 'Apoios encostam na face interna das coxas; ajuste a abertura inicial sem forçar.', 'Feche as pernas contra os apoios e volte com controle; não é a máquina de abrir as pernas.'),
  'panturrilha-sentada': review('Inferiores', 'Iniciante', 'machine', ['calves'], [], 'Sente com joelhos flexionados, apoio sobre as coxas e antepé na plataforma.', 'Solte e reencaixe a trava com controle. O movimento vem dos tornozelos, sem quicar.'),
  'supino-inclinado-halteres': review('Superiores', 'Intermediário', 'per-implement', ['chest'], ['shoulders', 'triceps'], 'Incline o banco em torno de 30°; mantenha costas e pés apoiados, com um halter em cada mão.', 'Não transforme o banco em desenvolvimento quase vertical. Controle os pesos ao sentar e levantar.'),
  'barra-fixa-assistida': review('Superiores', 'Intermediário', 'assistance', ['lats'], ['biceps', 'upperBack'], 'Use a plataforma de joelhos do gravitron e a pegada com palmas para a frente.', 'Mais peso selecionado significa mais ajuda, não mais resistência. Entre e saia pelos degraus fixos com controle.'),
  'face-pull': review('Superiores', 'Intermediário', 'machine', ['shoulders', 'upperBack'], [], 'Fixe uma corda à altura dos olhos e recue até manter tensão no cabo.', 'Puxe em direção ao rosto separando as mãos, sem arquear a lombar ou aproximar os ombros das orelhas.'),
  'flexao-bracos': review('Superiores', 'Intermediário', 'none', ['chest', 'triceps'], ['shoulders', 'abs'], 'Apoie mãos um pouco além da largura dos ombros e pontas dos pés no chão.', 'Mantenha tronco e pelve juntos ao descer. A variação desta ficha é no chão, sem apoio dos joelhos.'),
  'prancha-lateral': review('Core', 'Intermediário', 'none', ['obliques'], ['abs', 'hips', 'shoulders'], 'Deite de lado com cotovelo sob o ombro e pernas estendidas, pés empilhados.', 'Eleve a pelve sem girar o tronco e sustente. Registre o tempo de cada lado em linhas separadas.', 'time'),
  'dead-bug': review('Core', 'Iniciante', 'none', ['abs'], ['obliques'], 'Deite com braços voltados ao teto e quadris e joelhos flexionados aproximadamente a 90°.', 'Afaste braço e perna opostos sem perder o controle do tronco; reduza a amplitude se a lombar arquear.', 'alternating'),
  'remo-ergometro': review('Cardio', 'Intermediário', 'none', [], [], 'Ajuste as cintas dos pés no remo de banco deslizante; joelhos flexionados e braços estendidos na entrada.', 'Na puxada: pernas, tronco, braços. Na volta: braços, tronco, pernas. Dois quadros não mostram toda essa sequência.', 'time'),
  ciclismo: review('Cardio', 'Iniciante', 'none', [], [], 'Confira freios, pneus, altura do selim e capacete; escolha um trajeto compatível com sua experiência.', 'Observe trânsito, visibilidade e condições do percurso. Não interaja com o app enquanto pedala.', 'time'),
}

const sessions: Record<string, [string, string]> = {
  esteira: ['Ajuste o ritmo com os pés em apoio estável e identifique o dispositivo de parada da esteira.', 'Use a demonstração para reconhecer a atividade, não para determinar velocidade ou inclinação.'],
  'corrida-esteira': ['Confira o dispositivo de parada e aumente o ritmo gradualmente.', 'Evite saltar para as laterais com a lona em movimento; reduza a velocidade antes de sair.'],
  'caminhada-rua': ['Escolha calçado e percurso adequados às condições do dia.', 'Priorize visibilidade e travessias seguras; registre os dados quando estiver parada.'],
  'corrida-rua': ['Escolha um percurso compatível com sua experiência e faça a transição de ritmo gradualmente.', 'Distância e ritmo variam com terreno e clima. Não compare corrida ao ar livre e esteira como condições idênticas.'],
  bicicleta: ['Ajuste selim e guidão para alcançar os pedais sem balançar a pelve.', 'A distância estimada pelo painel não equivale necessariamente à distância de uma bicicleta na rua.'],
  eliptico: ['Suba com os pedais parados, alcance as alças e comece com resistência confortável.', 'Mantenha os pés nos pedais; a escala de resistência e distância varia entre aparelhos.'],
  escada: ['Identifique a parada e os apoios fixos antes de iniciar os degraus.', 'Use os apoios para equilíbrio, sem pendurar o peso do corpo. Não pule degraus nesta demonstração.'],
  natacao: ['Registre o estilo, o tamanho da piscina e as pausas na observação, se quiser comparar sessões.', 'Pratique em local seguro e supervisionado, conforme sua familiaridade com a água. A imagem representa apenas o nado livre.'],
  danca: ['Escolha a modalidade ou aula e registre o tempo efetivamente praticado.', 'A exigência varia com os passos e o ritmo. A ilustração é representativa, não uma sequência de aula.'],
  yoga: ['Registre a duração e o tipo de prática; a sequência pode variar a cada sessão.', 'Não deduzimos os músculos da sessão a partir da pose ilustrada. Adaptações dependem de orientação e conforto.'],
  pilates: ['Registre se a sessão foi no solo ou em aparelhos e anote o foco trabalhado.', 'A ponte ilustrada é apenas um exemplo do Pilates no solo, não representa uma sessão inteira.'],
  mobilidade: ['Registre o tempo e as regiões ou movimentos que você realmente praticou.', 'Mobilidade e alongamento não são a mesma tarefa. Evite forçar amplitudes ou interpretar desconforto como meta.'],
}
for (const [id, [setup, care]] of Object.entries(sessions)) catalogReview[id] = review(['danca', 'yoga', 'pilates', 'mobilidade'].includes(id) ? 'Prática livre' : 'Cardio', ['corrida-rua', 'corrida-esteira', 'natacao'].includes(id) ? 'Intermediário' : 'Iniciante', 'none', [], [], setup, care, 'time')

export const loadConventionLabels: Record<LoadConvention, string> = {
  total: 'Carga total', 'per-implement': 'Carga por halter', machine: 'Carga da máquina', assistance: 'Assistência da máquina', none: 'Sem carga externa nesta variação',
}
export function recordingHint(analysis: ExerciseAnalysis) {
  const load = { total: 'Registre a carga total; com barra, inclua barra e anilhas.', 'per-implement': 'Registre o peso de um halter, não a soma dos dois.', machine: 'Registre a seleção de placas ou a soma das anilhas adicionadas e identifique a máquina na observação. Não estime o peso do trenó; mantenha a mesma convenção nas próximas sessões.', assistance: 'Registre a assistência selecionada. Um valor menor significa menos ajuda; não equivale a levantar mais peso.', none: 'Personalize as medidas conforme o que realmente praticou.' }[analysis.loadConvention]
  return `${load}${analysis.repetitions === 'per-side' ? ' Repetições por lado; anote diferenças entre os lados.' : analysis.repetitions === 'alternating' ? ' Cada extensão de um lado conta uma repetição; registre o total alternado.' : ''}`
}

export function applyCatalogReview(exercise: Exercise): Exercise {
  const row = catalogReview[exercise.id]
  if (!row) return exercise
  // The detailed muscle list is the single source for both schematic and analytics.
  const mapRegions = (names: string[]) => [...new Set(names.flatMap(name => muscleMapping(name)?.regions ?? []))]
  const primaryRegions = row.analysis.kind === 'session' ? [] : mapRegions(exercise.curation?.primaryMuscles ?? [])
  const secondaryRegions = row.analysis.kind === 'session' ? [] : mapRegions(exercise.curation?.secondaryMuscles ?? []).filter(region => !primaryRegions.includes(region))
  const analysis = { ...row.analysis, primaryRegions, secondaryRegions }
  return { ...exercise, name: row.name ?? exercise.name, aliases: [...new Set([...exercise.aliases, exercise.name])], analysis,
    editorial: { reviewedAt: '2026-09-06', setup: row.setup, care: row.care, recordingHint: recordingHint(analysis), references: editorialReferences[exercise.id] ?? [] },
    curation: exercise.curation ? { ...exercise.curation, stimulusToFatigue: undefined, suggestedRepRange: undefined,
      ...(row.analysis.kind === 'session' ? { primaryMuscles: [], secondaryMuscles: [] } : {}),
    } : undefined,
  }
}
