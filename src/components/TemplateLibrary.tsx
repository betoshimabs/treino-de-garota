import { useRef, useState } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { defaultMetricsForMode } from '../domain'
import type { AppSnapshot, Exercise, Workout, WorkoutTemplate } from '../types'

export function TemplateLibrary({ templates, exercises, data, refresh }: { templates: WorkoutTemplate[]; exercises: Exercise[]; data: AppSnapshot; refresh: () => Promise<void> }) {
  const [level, setLevel] = useState('Todos')
  const [focus, setFocus] = useState('Todos')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const navigate = useNavigate()
  const start = async (template: WorkoutTemplate) => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      await db.transaction('rw', db.workouts, async () => {
        if (await db.workouts.filter(workout => workout.status === 'active').first()) return
        const selected = template.exerciseIds.map(id => exercises.find(exercise => exercise.id === id)).filter((exercise): exercise is Exercise => !!exercise)
        if (!selected.length) throw new Error('Este modelo não tem exercícios disponíveis. Você pode criar um modelo pessoal.')
        const workout: Workout = { id: crypto.randomUUID(), title: 'Treino de hoje', titleMode: 'auto', status: 'active', startedAt: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, sourceTemplateId: template.id, restSeconds: 90, loadUnit: data.profile.loadUnit,
          items: selected.map(exercise => ({ id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, category: exercise.category, metricMode: exercise.metricMode, metrics: defaultMetricsForMode(exercise.metricMode), analysis: exercise.analysis, sets: [{ id: crypto.randomUUID(), completed: false }] })) }
        await db.workouts.add(workout)
      })
      await refresh(); navigate('/treino/ativo')
    } catch { setError('Não conseguimos abrir o modelo agora. Seu treino atual foi preservado. Tente novamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  const filtered = templates.filter(template => (level === 'Todos' || template.level === level || level === 'Pessoais' && template.origin === 'custom') && (focus === 'Todos' || template.focus === focus))
  return <div className="template-library curated-templates">
    <p className="library-note">Um ponto de partida, não uma obrigação. Nível indica familiaridade com a execução; carga, séries e intensidade continuam suas.</p>
    <div className="template-filters"><label className="field"><span>Familiaridade</span><select value={level} onChange={event => setLevel(event.target.value)}>{['Todos', 'Iniciante', 'Intermediário', 'Avançado', 'Pessoais'].map(value => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Foco</span><select value={focus} onChange={event => setFocus(event.target.value)}>{['Todos', ...new Set(templates.flatMap(template => template.focus ? [template.focus] : []))].map(value => <option key={value}>{value}</option>)}</select></label></div>
    {error && <p role="alert">{error}</p>}
    {data.workouts.some(workout => workout.status === 'active') && <p className="care-note">Você tem um treino aberto. Continue nele; os modelos podem ser adicionados pelo seletor de exercícios.</p>}
    {!filtered.length && <p className="empty-gentle">Nenhum modelo nesta combinação. Experimente outro foco ou crie o seu.</p>}
    {filtered.map(template => <article className="curated-template" key={template.id}><p className="eyebrow">{template.level ?? 'Pessoal'} · {template.focus ?? 'Seu foco'}</p><h2>{template.name}</h2><p>{template.intention ?? template.note}</p><details className="evolution-details"><summary>{template.exerciseIds.length} atividades · Ver a sequência <ChevronDown size={17} /></summary><ol>{template.exerciseIds.map(id => <li key={id}><NavLink to={`/exercicios/${id}`}>{exercises.find(exercise => exercise.id === id)?.name ?? 'Exercício indisponível'}</NavLink></li>)}</ol>{template.preparation && <p className="muted">{template.preparation}</p>}</details><button className="template-start" disabled={busy} onClick={() => void start(template)}>{busy ? 'Abrindo…' : data.workouts.some(workout => workout.status === 'active') ? 'Continuar meu treino' : 'Começar com este modelo'}<ArrowRight size={18} /></button></article>)}
  </div>
}
