import type { WorkoutTemplate } from '../types'

export const systemTemplates: WorkoutTemplate[] = [
  {
    id: 'template-pernas-base',
    name: 'Pernas — base',
    note: '5 exercícios · musculação',
    exerciseIds: ['agachamento-livre', 'leg-press', 'cadeira-extensora', 'mesa-flexora', 'panturrilha-em-pe'],
    origin: 'system',
  },
  {
    id: 'template-gluteos-posterior',
    name: 'Glúteos + posterior',
    note: '5 exercícios · musculação',
    exerciseIds: ['elevacao-pelvica', 'stiff', 'cadeira-flexora', 'gluteo-cabo', 'cadeira-abdutora'],
    origin: 'system',
  },
  {
    id: 'template-superiores',
    name: 'Superiores completo',
    note: '6 exercícios · musculação',
    exerciseIds: ['supino-halteres', 'puxada-frente', 'remada-baixa', 'desenvolvimento', 'rosca-martelo', 'triceps-corda'],
    origin: 'system',
  },
  {
    id: 'template-misto-leve',
    name: 'Misto + cardio leve',
    note: '4 exercícios · duas modalidades',
    exerciseIds: ['agachamento-livre', 'puxada-frente', 'elevacao-lateral', 'esteira'],
    origin: 'system',
  },
]
