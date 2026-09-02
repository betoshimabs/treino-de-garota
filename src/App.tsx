import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlus,
  Clock3,
  Download,
  Dumbbell,
  Heart,
  Home,
  ImagePlus,
  Info,
  MoreHorizontal,
  NotebookPen,
  Pause,
  PencilLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { db, clearAllData, defaultProfile, loadSnapshot, saveProfile } from './db'
import { exerciseGroups, exercises as systemExercises } from './data/exercises'
import { exerciseProgress, thisMonthCount, totalCompletedSets, workoutDurationMinutes } from './stats'
import type { AppSnapshot, Exercise, Feeling, Profile, TimelineEntry, Workout, WorkoutItem, WorkoutSet } from './types'

const makeId = () => crypto.randomUUID()
const formatDay = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '')
const formatLongDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value))
const formatTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const emptySnapshot: AppSnapshot = { workouts: [], timeline: [], favorites: [], customExercises: [], profile: defaultProfile }

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

function AppContent() {
  const [data, setData] = useState<AppSnapshot>(emptySnapshot)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [updateReady, setUpdateReady] = useState(false)
  const location = useLocation()

  const refresh = async () => {
    setData(await loadSnapshot())
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const updateListener = () => setUpdateReady(true)
    window.addEventListener('tg:update-ready', updateListener)
    return () => window.removeEventListener('tg:update-ready', updateListener)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const activeWorkout = data.workouts.find((workout) => workout.status === 'active')
  const showNav = !location.pathname.startsWith('/treino/ativo')
  const allExercises = useMemo(() => [...systemExercises, ...data.customExercises], [data.customExercises])

  if (loading) {
    return <main className="loading-screen"><span className="brand-mark">tg</span><p>Abrindo seu diário…</p></main>
  }

  if (!data.profile.onboarded) {
    return <Onboarding profile={data.profile} onDone={async (profile) => { await saveProfile(profile); await refresh() }} />
  }

  const shared = { data, refresh, setNotice, allExercises }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      {updateReady && (
        <div className="update-banner" role="status">
          <span>Uma versão nova está pronta.</span>
          <button onClick={() => window.location.reload()}>Atualizar</button>
        </div>
      )}
      {activeWorkout && !location.pathname.startsWith('/treino/ativo') && (
        <NavLink className="active-workout-bar" to="/treino/ativo">
          <span><span className="pulse-dot" /> treino em andamento</span>
          <span>continuar <ChevronRight size={17} /></span>
        </NavLink>
      )}
      <main id="conteudo" className={showNav ? 'page-area with-nav' : 'page-area'}>
        <Routes>
          <Route path="/" element={<TodayPage {...shared} />} />
          <Route path="/treino/ativo" element={<WorkoutPage {...shared} />} />
          <Route path="/treino/:id" element={<WorkoutDetail data={data} />} />
          <Route path="/linha" element={<TimelinePage {...shared} />} />
          <Route path="/exercicios" element={<ExercisesPage {...shared} />} />
          <Route path="/exercicios/:id" element={<ExerciseDetail allExercises={allExercises} data={data} refresh={refresh} />} />
          <Route path="/evolucao" element={<EvolutionPage data={data} allExercises={allExercises} />} />
          <Route path="/eu" element={<ProfilePage {...shared} />} />
          <Route path="*" element={<TodayPage {...shared} />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

type SharedProps = {
  data: AppSnapshot
  refresh: () => Promise<void>
  setNotice: (message: string) => void
  allExercises: Exercise[]
}

function Onboarding({ profile, onDone }: { profile: Profile; onDone: (profile: Profile) => Promise<void> }) {
  const [unit, setUnit] = useState<Profile['loadUnit']>(profile.loadUnit)
  const [busy, setBusy] = useState(false)
  return (
    <main className="onboarding">
      <div className="onboarding-mark"><span>tg</span></div>
      <p className="eyebrow">seu diário de treino</p>
      <h1>Do jeito que<br />aconteceu.</h1>
      <p className="lead">Registre seu treino e acompanhe sua história, sem cobrança.</p>
      <section className="onboarding-choice" aria-labelledby="unit-title">
        <h2 id="unit-title">Você usa qual unidade?</h2>
        <div className="segmented">
          <button className={unit === 'kg' ? 'selected' : ''} onClick={() => setUnit('kg')}>kg</button>
          <button className={unit === 'lb' ? 'selected' : ''} onClick={() => setUnit('lb')}>lb</button>
        </div>
      </section>
      <button className="primary-button wide" disabled={busy} onClick={async () => {
        setBusy(true)
        await onDone({ ...profile, loadUnit: unit, onboarded: true })
      }}>começar meu diário <ChevronRight size={19} /></button>
      <p className="privacy-note"><Info size={16} /> Seus dados ficam somente neste aparelho.</p>
    </main>
  )
}

function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>{action}</header>
}

function TodayPage({ data, refresh, setNotice }: SharedProps) {
  const navigate = useNavigate()
  const completed = data.workouts.filter((workout) => workout.status === 'completed')
  const active = data.workouts.find((workout) => workout.status === 'active')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite'
  const monthCount = thisMonthCount(data.workouts)

  const startWorkout = async (repeat?: Workout) => {
    if (active) return navigate('/treino/ativo')
    const workout: Workout = {
      id: makeId(),
      title: repeat?.title ?? 'Treino de hoje',
      status: 'active',
      startedAt: new Date().toISOString(),
      items: repeat?.items.map((item) => ({
        id: makeId(), exerciseId: item.exerciseId, exerciseName: item.exerciseName,
        sets: [{ id: makeId(), completed: false }],
      })) ?? [],
    }
    await db.workouts.put(workout)
    await refresh()
    navigate('/treino/ativo')
  }

  return (
    <div className="page today-page">
      <PageHeader eyebrow={`${greeting}${data.profile.nickname ? `, ${data.profile.nickname}` : ''}`} title="hoje" action={<span className="date-stamp">{formatDay(new Date().toISOString())}</span>} />
      <section className="hero-action">
        <div className="soft-orbit"><Dumbbell size={31} strokeWidth={1.8} /></div>
        <div>
          <p>{active ? 'Seu treino está salvo.' : completed.length ? 'Pronta quando fizer sentido.' : 'Um treino por vez.'}</p>
          <h2>{active ? 'Continuar treino' : 'Começar treino'}</h2>
        </div>
        <button className="round-action" aria-label={active ? 'Continuar treino' : 'Começar treino'} onClick={() => void startWorkout()}><Play size={23} fill="currentColor" /></button>
      </section>
      {completed[0] && !active && <button className="quiet-action" onClick={() => void startWorkout(completed[0])}><RotateCcw size={17} /> repetir o último treino</button>}

      <section className="at-a-glance" aria-labelledby="glance-title">
        <div className="section-heading"><div><p className="eyebrow">um olhar rápido</p><h2 id="glance-title">seu ritmo</h2></div><span className="hand-line" /></div>
        <div className="glance-grid">
          <div><strong>{monthCount}</strong><span>{monthCount === 1 ? 'treino este mês' : 'treinos este mês'}</span></div>
          <div><strong>{totalCompletedSets(data.workouts)}</strong><span>séries registradas</span></div>
        </div>
      </section>

      <section className="recent-section" aria-labelledby="recent-title">
        <div className="section-heading"><h2 id="recent-title">últimos treinos</h2>{completed.length > 0 && <NavLink to="/linha">ver na linha</NavLink>}</div>
        {completed.length === 0 ? (
          <div className="empty-gentle"><NotebookPen size={22} /><p>Quando você finalizar um treino, ele aparece aqui.</p></div>
        ) : completed.slice(0, 3).map((workout) => (
          <NavLink className="workout-row" to={`/treino/${workout.id}`} key={workout.id}>
            <span className="workout-date">{formatDay(workout.endedAt ?? workout.startedAt)}</span>
            <span><strong>{workout.title}</strong><small>{workout.items.length} exercícios · {workoutDurationMinutes(workout)} min</small></span>
            <ChevronRight size={18} />
          </NavLink>
        ))}
      </section>
      <p className="little-note"><span>✦</span> voltar também faz parte</p>
    </div>
  )
}

function WorkoutPage({ data, refresh, setNotice, allExercises }: SharedProps) {
  const navigate = useNavigate()
  const active = data.workouts.find((workout) => workout.status === 'active')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [feeling, setFeeling] = useState<Feeling | undefined>()

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  if (!active) return <SimpleEmpty icon={<Dumbbell />} title="Nenhum treino em andamento" action={<button className="primary-button" onClick={() => navigate('/')}>voltar para hoje</button>} />

  const persist = async (next: Workout) => { await db.workouts.put(next); await refresh() }
  const updateItem = async (itemId: string, fn: (item: WorkoutItem) => WorkoutItem) => {
    await persist({ ...active, items: active.items.map((item) => item.id === itemId ? fn(item) : item) })
  }
  const addExercise = async (exercise: Exercise) => {
    const item: WorkoutItem = { id: makeId(), exerciseId: exercise.id, exerciseName: exercise.name, sets: [{ id: makeId(), completed: false }] }
    await persist({ ...active, items: [...active.items, item] })
    setPickerOpen(false); setQuery('')
  }
  const updateSet = async (itemId: string, setId: string, patch: Partial<WorkoutSet>) => {
    await updateItem(itemId, (item) => ({ ...item, sets: item.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }))
  }
  const completeSet = async (itemId: string, set: WorkoutSet) => {
    await updateSet(itemId, set.id, { completed: !set.completed })
    if (!set.completed) setSeconds(90)
  }
  const finish = async () => {
    const hasSet = active.items.some((item) => item.sets.some((set) => set.completed))
    if (!hasSet) { setNotice('Conclua ao menos uma série antes de finalizar.'); return }
    const endedAt = new Date().toISOString()
    const completedWorkout = { ...active, status: 'completed' as const, endedAt, feeling }
    const exerciseCount = active.items.length
    const setCount = active.items.reduce((sum, item) => sum + item.sets.filter((set) => set.completed).length, 0)
    const entry: TimelineEntry = {
      id: makeId(), kind: 'workout', occurredAt: endedAt, title: active.title,
      text: `${exerciseCount} ${exerciseCount === 1 ? 'exercício' : 'exercícios'} · ${setCount} ${setCount === 1 ? 'série' : 'séries'}`,
      sourceId: active.id, isMilestone: false,
    }
    await db.transaction('rw', [db.workouts, db.timeline], async () => { await db.workouts.put(completedWorkout); await db.timeline.put(entry) })
    await refresh(); setNotice('Treino guardado na sua linha.'); navigate('/linha')
  }
  const abandon = async () => {
    if (!window.confirm('Apagar este treino em andamento? As séries registradas serão removidas.')) return
    await db.workouts.delete(active.id); await refresh(); navigate('/')
  }
  const filtered = allExercises.filter((exercise) => `${exercise.name} ${exercise.aliases.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 14)
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60000))

  return (
    <div className="workout-page">
      <header className="workout-topbar">
        <button className="icon-button" aria-label="Voltar" onClick={() => navigate('/')}><ArrowLeft /></button>
        <div><p>treino em andamento</p><strong>{elapsed < 1 ? 'agora' : `${elapsed} min`}</strong></div>
        <button className="icon-button" aria-label="Opções do treino" onClick={abandon}><MoreHorizontal /></button>
      </header>
      <div className="workout-title-wrap">
        <input className="workout-title" aria-label="Nome do treino" value={active.title} onChange={(event) => void persist({ ...active, title: event.target.value })} />
        <span className="pink-swoop" />
      </div>

      {active.items.length === 0 ? (
        <div className="workout-empty"><div className="soft-orbit"><Plus size={28} /></div><h2>Qual foi o primeiro?</h2><p>Adicione um exercício para começar a registrar.</p></div>
      ) : active.items.map((item, itemIndex) => (
        <section className="exercise-block" key={item.id} aria-labelledby={`exercise-${item.id}`}>
          <div className="exercise-block-title"><span>{String(itemIndex + 1).padStart(2, '0')}</span><h2 id={`exercise-${item.id}`}>{item.exerciseName}</h2><button className="icon-button small" aria-label={`Remover ${item.exerciseName}`} onClick={() => void persist({ ...active, items: active.items.filter((row) => row.id !== item.id) })}><X /></button></div>
          <div className="set-head"><span>série</span><span>carga ({data.profile.loadUnit})</span><span>reps</span><span>feito</span></div>
          {item.sets.map((set, setIndex) => (
            <div className={set.completed ? 'set-row completed' : 'set-row'} key={set.id}>
              <span className="set-number">{setIndex + 1}</span>
              <input inputMode="decimal" aria-label={`Carga da série ${setIndex + 1}`} value={set.load ?? ''} placeholder="—" onChange={(event) => void updateSet(item.id, set.id, { load: event.target.value ? Number(event.target.value) : undefined })} />
              <input inputMode="numeric" aria-label={`Repetições da série ${setIndex + 1}`} value={set.reps ?? ''} placeholder="—" onChange={(event) => void updateSet(item.id, set.id, { reps: event.target.value ? Number(event.target.value) : undefined })} />
              <button className="set-check" aria-label={set.completed ? `Reabrir série ${setIndex + 1}` : `Concluir série ${setIndex + 1}`} aria-pressed={set.completed} onClick={() => void completeSet(item.id, set)}>{set.completed && <Check size={19} />}</button>
            </div>
          ))}
          <button className="add-set" onClick={() => void updateItem(item.id, (row) => ({ ...row, sets: [...row.sets, { id: makeId(), completed: false, load: row.sets.at(-1)?.load, reps: row.sets.at(-1)?.reps }] }))}><Plus size={17} /> adicionar série</button>
          <input className="note-input" aria-label={`Observação sobre ${item.exerciseName}`} placeholder="uma observação, se quiser…" value={item.note ?? ''} onChange={(event) => void updateItem(item.id, (row) => ({ ...row, note: event.target.value }))} />
        </section>
      ))}

      <button className="add-exercise-button" onClick={() => setPickerOpen(true)}><CirclePlus size={20} /> adicionar exercício</button>
      {seconds > 0 && <div className="rest-timer"><Clock3 size={18} /><span>descanso</span><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><button onClick={() => setSeconds(0)}><X size={17} /> pular</button></div>}
      <section className="finish-area">
        <p>como foi hoje? <span>opcional</span></p>
        <div className="feeling-row">
          {(['leve', 'normal', 'intenso'] as Feeling[]).map((value) => <button className={feeling === value ? 'selected' : ''} key={value} onClick={() => setFeeling(feeling === value ? undefined : value)}>{value}</button>)}
        </div>
        <button className="primary-button wide" onClick={() => void finish()}><Check size={19} /> finalizar treino</button>
      </section>

      {pickerOpen && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerOpen(false) }}><section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div className="sheet-handle" /><header><h2 id="picker-title">adicionar exercício</h2><button className="icon-button" aria-label="Fechar" onClick={() => setPickerOpen(false)}><X /></button></header><label className="search-field"><Search size={19} /><input autoFocus placeholder="buscar exercício" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="picker-list">{filtered.map((exercise) => <button key={exercise.id} onClick={() => void addExercise(exercise)}><span><strong>{exercise.name}</strong><small>{exercise.group} · {exercise.equipment}</small></span><Plus size={19} /></button>)}</div></section></div>}
    </div>
  )
}

function TimelinePage({ data, refresh, setNotice }: SharedProps) {
  const [composer, setComposer] = useState(false)
  const [note, setNote] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string>()
  const [filter, setFilter] = useState<'all' | 'milestones'>('all')
  const visible = data.timeline.filter((entry) => filter === 'all' || entry.isMilestone)

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setNotice('Escolha uma imagem.'); return }
    if (file.size > 8_000_000) { setNotice('Essa foto é grande demais. Escolha uma de até 8 MB.'); return }
    setImageDataUrl(await compressImage(file))
  }
  const saveEntry = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim() && !imageDataUrl) return
    const entry: TimelineEntry = { id: makeId(), kind: imageDataUrl ? 'photo' : 'note', occurredAt: new Date().toISOString(), title: imageDataUrl ? 'Um registro de hoje' : 'Nota de hoje', text: note.trim(), imageDataUrl, isMilestone: false }
    await db.timeline.put(entry); await refresh(); setNote(''); setImageDataUrl(undefined); setComposer(false); setNotice('Guardado na sua linha.')
  }

  return (
    <div className="page timeline-page">
      <PageHeader eyebrow="só sua" title="minha linha" action={<button className="round-action small" aria-label="Adicionar à linha" onClick={() => setComposer(true)}><Plus /></button>} />
      <div className="filter-row"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>tudo</button><button className={filter === 'milestones' ? 'selected' : ''} onClick={() => setFilter('milestones')}>marcos</button></div>
      {visible.length === 0 ? <SimpleEmpty icon={<NotebookPen />} title={filter === 'milestones' ? 'Nenhum marco ainda' : 'Sua linha começa aqui'} text={filter === 'milestones' ? 'Você escolhe o que merece ficar em destaque.' : 'Treinos, notas e fotos vão formar sua história.'} action={filter === 'all' && <button className="secondary-button" onClick={() => setComposer(true)}>fazer uma anotação</button>} /> : (
        <div className="timeline-rail">
          {visible.map((entry) => <TimelineItem key={entry.id} entry={entry} refresh={refresh} setNotice={setNotice} />)}
        </div>
      )}
      {composer && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposer(false) }}><form className="bottom-sheet composer" onSubmit={(event) => void saveEntry(event)}><div className="sheet-handle" /><header><h2>guardar na linha</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={() => setComposer(false)}><X /></button></header>{imageDataUrl && <img className="composer-preview" src={imageDataUrl} alt="Prévia da foto escolhida" />}<textarea autoFocus={!imageDataUrl} value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que você quer lembrar?" aria-label="Anotação" /><div className="composer-actions"><label className="secondary-button file-button"><ImagePlus size={18} /> foto<input type="file" accept="image/*" onChange={(event) => void choosePhoto(event)} /></label><button className="primary-button" disabled={!note.trim() && !imageDataUrl}>guardar</button></div><p className="privacy-note"><Info size={15} /> A foto fica neste aparelho.</p></form></div>}
    </div>
  )
}

function TimelineItem({ entry, refresh, setNotice }: { entry: TimelineEntry; refresh: () => Promise<void>; setNotice: (message: string) => void }) {
  const toggleMilestone = async () => { await db.timeline.put({ ...entry, isMilestone: !entry.isMilestone }); await refresh(); setNotice(entry.isMilestone ? 'Marco removido.' : 'Virou um marco seu.') }
  const remove = async () => { if (!window.confirm('Remover este registro da sua linha?')) return; await db.timeline.delete(entry.id); await refresh(); setNotice('Registro removido.') }
  return (
    <article className={`timeline-entry ${entry.isMilestone ? 'milestone' : ''}`}>
      <div className="timeline-dot">{entry.kind === 'workout' ? <Dumbbell size={16} /> : entry.kind === 'photo' ? <ImagePlus size={16} /> : <PencilLine size={16} />}</div>
      <div className="timeline-date"><strong>{formatDay(entry.occurredAt)}</strong><span>{formatTime(entry.occurredAt)}</span></div>
      <div className="timeline-content">
        {entry.isMilestone && <p className="milestone-label"><Star size={14} fill="currentColor" /> meu marco</p>}
        <h2>{entry.title}</h2>
        {entry.text && <p>{entry.text}</p>}
        {entry.imageDataUrl && <img src={entry.imageDataUrl} alt={entry.text ? `Foto: ${entry.text}` : 'Foto pessoal sem descrição'} />}
        <div className="entry-actions"><button onClick={() => void toggleMilestone()}><Star size={16} fill={entry.isMilestone ? 'currentColor' : 'none'} /> {entry.isMilestone ? 'desmarcar' : 'marcar'}</button><button onClick={() => void remove()}><Trash2 size={16} /> remover</button></div>
      </div>
    </article>
  )
}

function ExercisesPage({ data, refresh, setNotice, allExercises }: SharedProps) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('Todos')
  const [creating, setCreating] = useState(false)
  const filtered = allExercises.filter((exercise) => (group === 'Todos' || exercise.group === group) && `${exercise.name} ${exercise.aliases.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const toggleFavorite = async (id: string) => {
    if (data.favorites.includes(id)) await db.favorites.delete(id); else await db.favorites.put({ exerciseId: id })
    await refresh()
  }
  return (
    <div className="page exercises-page">
      <PageHeader eyebrow="para consultar" title="exercícios" action={<button className="icon-button soft" aria-label="Criar exercício pessoal" onClick={() => setCreating(true)}><Plus /></button>} />
      <label className="search-field prominent"><Search size={19} /><input placeholder="buscar pelo nome" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="filter-row scrollable">{exerciseGroups.map((value) => <button key={value} className={group === value ? 'selected' : ''} onClick={() => setGroup(value)}>{value.toLocaleLowerCase()}</button>)}</div>
      <p className="result-count">{filtered.length} {filtered.length === 1 ? 'exercício' : 'exercícios'}</p>
      <div className="exercise-list">{filtered.map((exercise) => <div className="exercise-list-row" key={exercise.id}><NavLink to={`/exercicios/${exercise.id}`}><span className="exercise-glyph">{exercise.name.slice(0, 1).toLocaleLowerCase()}</span><span><strong>{exercise.name}</strong><small>{exercise.group} · {exercise.equipment}{exercise.origin === 'custom' ? ' · pessoal' : ''}</small></span></NavLink><button className="icon-button small" aria-label={data.favorites.includes(exercise.id) ? `Desfavoritar ${exercise.name}` : `Favoritar ${exercise.name}`} onClick={() => void toggleFavorite(exercise.id)}><Heart size={19} fill={data.favorites.includes(exercise.id) ? 'currentColor' : 'none'} /></button></div>)}</div>
      {creating && <CustomExerciseSheet onClose={() => setCreating(false)} onSaved={async () => { await refresh(); setCreating(false); setNotice('Exercício pessoal criado.') }} />}
    </div>
  )
}

function CustomExerciseSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('Pernas')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!name.trim()) return
    await db.customExercises.put({ id: `custom-${makeId()}`, name: name.trim(), aliases: [], group, equipment: 'Personalizado', instructions: ['Registre aqui as observações que funcionam para você.'], origin: 'custom' }); await onSaved()
  }
  return <div className="sheet-backdrop"><form className="bottom-sheet" onSubmit={(event) => void submit(event)}><div className="sheet-handle" /><header><h2>novo exercício</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X /></button></header><label className="field"><span>nome</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="ex.: passada no step" /></label><label className="field"><span>grupo principal</span><select value={group} onChange={(event) => setGroup(event.target.value)}>{exerciseGroups.filter((value) => value !== 'Todos').map((value) => <option key={value}>{value}</option>)}</select></label><button className="primary-button wide" disabled={!name.trim()}>criar exercício</button></form></div>
}

function ExerciseDetail({ allExercises, data, refresh }: { allExercises: Exercise[]; data: AppSnapshot; refresh: () => Promise<void> }) {
  const { id } = useParams(); const navigate = useNavigate(); const exercise = allExercises.find((item) => item.id === id)
  if (!exercise) return <SimpleEmpty icon={<BookOpen />} title="Exercício não encontrado" />
  const favorite = data.favorites.includes(exercise.id)
  return <div className="page detail-page"><header className="detail-top"><button className="icon-button" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft /></button><button className="icon-button soft" aria-label={favorite ? 'Desfavoritar' : 'Favoritar'} onClick={async () => { if (favorite) await db.favorites.delete(exercise.id); else await db.favorites.put({ exerciseId: exercise.id }); await refresh() }}><Heart fill={favorite ? 'currentColor' : 'none'} /></button></header><p className="eyebrow">{exercise.group} · {exercise.equipment}</p><h1>{exercise.name}</h1><div className="detail-illustration"><span>{exercise.name.slice(0, 1).toLocaleLowerCase()}</span><i /></div><section><p className="eyebrow">um passo de cada vez</p><ol className="instruction-list">{exercise.instructions.map((instruction, index) => <li key={instruction}><span>{index + 1}</span><p>{instruction}</p></li>)}</ol></section><aside className="care-note"><Info size={18} /><p>Use uma carga confortável e interrompa se sentir dor. Estas dicas não substituem orientação profissional.</p></aside></div>
}

function EvolutionPage({ data, allExercises }: { data: AppSnapshot; allExercises: Exercise[] }) {
  const completed = data.workouts.filter((workout) => workout.status === 'completed')
  const usedExercises = Array.from(new Set(completed.flatMap((workout) => workout.items.map((item) => item.exerciseId))))
  const [selected, setSelected] = useState(usedExercises[0] ?? '')
  const points = exerciseProgress(data.workouts, selected)
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const selectedName = allExercises.find((exercise) => exercise.id === selected)?.name
  return <div className="page evolution-page"><PageHeader eyebrow="sem pressa" title="evolução" /><section className="month-summary"><p>neste mês</p><strong>{thisMonthCount(data.workouts)}</strong><span>treinos que você guardou</span><i /></section><div className="stat-strip"><div><strong>{completed.length}</strong><span>treinos no total</span></div><div><strong>{totalCompletedSets(data.workouts)}</strong><span>séries concluídas</span></div></div><section className="progress-section"><div className="section-heading"><div><p className="eyebrow">carga por sessão</p><h2>um exercício</h2></div></div>{usedExercises.length === 0 ? <div className="empty-gentle"><BarChart3 size={22} /><p>Registre alguns treinos para enxergar mudanças por aqui.</p></div> : <><label className="field compact"><span>exercício</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{usedExercises.map((id) => <option key={id} value={id}>{allExercises.find((exercise) => exercise.id === id)?.name ?? id}</option>)}</select></label>{points.length === 0 ? <p className="chart-summary">Ainda não há cargas concluídas para este exercício.</p> : <><div className="mini-chart" role="img" aria-label={`Evolução da carga em ${selectedName}: ${points.map((point) => `${point.value} ${data.profile.loadUnit} em ${formatDay(point.date)}`).join(', ')}`}><span className="chart-max">{maxValue} {data.profile.loadUnit}</span><div className="chart-bars">{points.slice(-8).map((point) => <div key={point.date} style={{ height: `${Math.max(12, point.value / maxValue * 100)}%` }}><span>{point.value}</span></div>)}</div></div><p className="chart-summary">Maior carga registrada em {selectedName}: <strong>{maxValue} {data.profile.loadUnit}</strong>.</p></>}</>}</section><p className="little-note"><span>✦</span> evolução também é voltar, ajustar e continuar</p></div>
}

function ProfilePage({ data, refresh, setNotice }: SharedProps) {
  const [profile, setLocalProfile] = useState(data.profile)
  const fileRef = useRef<HTMLInputElement>(null)
  const persistProfile = async (next: Profile) => { setLocalProfile(next); await saveProfile(next); await refresh() }
  const exportData = async () => {
    const backup = { app: 'treino-de-garota', schemaVersion: 1, exportedAt: new Date().toISOString(), data }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `treino-de-garota-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setNotice('Backup baixado.')
  }
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    try {
      const backup = JSON.parse(await file.text()) as { app?: string; schemaVersion?: number; data?: AppSnapshot }
      if (backup.app !== 'treino-de-garota' || backup.schemaVersion !== 1 || !backup.data) throw new Error('invalid')
      if (!window.confirm('Substituir os dados deste aparelho pelos dados do backup?')) return
      await clearAllData()
      await db.transaction('rw', [db.workouts, db.timeline, db.favorites, db.customExercises, db.profiles], async () => {
        await db.workouts.bulkPut(backup.data!.workouts); await db.timeline.bulkPut(backup.data!.timeline); await db.favorites.bulkPut(backup.data!.favorites.map((exerciseId) => ({ exerciseId }))); await db.customExercises.bulkPut(backup.data!.customExercises); await db.profiles.put(backup.data!.profile)
      })
      await refresh(); setNotice('Backup restaurado.')
    } catch { setNotice('Este arquivo não é um backup válido.') } finally { event.target.value = '' }
  }
  const erase = async () => {
    if (!window.confirm('Apagar todos os treinos, fotos, notas e preferências deste aparelho? Esta ação não pode ser desfeita.')) return
    await clearAllData(); await saveProfile({ ...defaultProfile, onboarded: true }); await refresh(); setNotice('Dados apagados deste aparelho.')
  }
  return <div className="page profile-page"><PageHeader eyebrow="seu espaço" title="eu" /><section className="profile-intro"><div className="avatar-soft"><UserRound /></div><label><span>como quer ser chamada?</span><input value={profile.nickname} placeholder="seu apelido" onBlur={() => void persistProfile(profile)} onChange={(event) => setLocalProfile({ ...profile, nickname: event.target.value })} /></label></section><section className="settings-section"><h2>preferências</h2><div className="setting-row"><span><strong>unidade de carga</strong><small>usada nos próximos registros</small></span><div className="segmented small"><button className={profile.loadUnit === 'kg' ? 'selected' : ''} onClick={() => void persistProfile({ ...profile, loadUnit: 'kg' })}>kg</button><button className={profile.loadUnit === 'lb' ? 'selected' : ''} onClick={() => void persistProfile({ ...profile, loadUnit: 'lb' })}>lb</button></div></div><div className="setting-row"><span><strong>peso corporal</strong><small>fica oculto enquanto desligado</small></span><button className={profile.bodyWeightEnabled ? 'switch on' : 'switch'} role="switch" aria-checked={profile.bodyWeightEnabled} onClick={() => void persistProfile({ ...profile, bodyWeightEnabled: !profile.bodyWeightEnabled })}><i /></button></div></section><section className="data-section"><p className="eyebrow">seus dados</p><h2>ficam neste aparelho</h2><p>Faça um backup para levar sua história com você ou recuperar depois.</p><button className="data-action" onClick={() => void exportData()}><Download /><span><strong>baixar backup</strong><small>treinos, notas, fotos e preferências</small></span><ChevronRight /></button><button className="data-action" onClick={() => fileRef.current?.click()}><Upload /><span><strong>restaurar backup</strong><small>substitui os dados deste aparelho</small></span><ChevronRight /></button><input ref={fileRef} hidden type="file" accept="application/json" onChange={(event) => void importData(event)} /><button className="danger-action" onClick={() => void erase()}><Trash2 size={18} /> apagar todos os dados</button></section><footer className="app-footer"><span className="brand-mark small">tg</span><p>treino de garota · primeiro diário</p></footer></div>
}

function WorkoutDetail({ data }: { data: AppSnapshot }) {
  const { id } = useParams(); const navigate = useNavigate(); const workout = data.workouts.find((item) => item.id === id)
  if (!workout) return <SimpleEmpty icon={<Dumbbell />} title="Treino não encontrado" />
  return <div className="page detail-page"><header className="detail-top"><button className="icon-button" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft /></button></header><p className="eyebrow">{formatLongDate(workout.endedAt ?? workout.startedAt)}</p><h1>{workout.title}</h1><p className="lead compact">{workoutDurationMinutes(workout)} min · {workout.items.length} exercícios{workout.feeling ? ` · ${workout.feeling}` : ''}</p><div className="workout-detail-list">{workout.items.map((item) => <section key={item.id}><h2>{item.exerciseName}</h2><p>{item.sets.filter((set) => set.completed).map((set) => `${set.load ?? '—'} ${data.profile.loadUnit} × ${set.reps ?? '—'}`).join('  ·  ') || 'Sem séries concluídas'}</p>{item.note && <small>{item.note}</small>}</section>)}</div></div>
}

function BottomNav() {
  const items = [
    { to: '/', label: 'Hoje', icon: Home }, { to: '/linha', label: 'Linha', icon: NotebookPen },
    { to: '/exercicios', label: 'Exercícios', icon: BookOpen }, { to: '/evolucao', label: 'Evolução', icon: BarChart3 }, { to: '/eu', label: 'Eu', icon: UserRound },
  ]
  return <nav className="bottom-nav" aria-label="Navegação principal">{items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={21} /><span>{label}</span></NavLink>)}</nav>
}

function SimpleEmpty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return <section className="simple-empty"><div className="soft-orbit">{icon}</div><h2>{title}</h2>{text && <p>{text}</p>}{action}</section>
}

async function compressImage(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source })
  const max = 1400; const scale = Math.min(1, max / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.78)
}

export default App
