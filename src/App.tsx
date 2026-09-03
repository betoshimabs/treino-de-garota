import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Dumbbell,
  Heart,
  Home,
  ImagePlus,
  Info,
  LogOut,
  NotebookPen,
  PencilLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Square,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CURRENT_RELEASE, getInitialUpdateFlow, type AppRelease, type UpdateFlow } from './app-version'
import { db, clearAllData, defaultProfile, loadSnapshot, saveProfile } from './db'
import { exerciseGroups, exercises as systemExercises } from './data/exercises'
import { systemTemplates } from './data/templates'
import { calculateBmi, defaultMetricsForMode, formatLocalizedNumber, isSetValidForMetrics, kgToLb, lbToKg, parseLocalizedNumber, workoutMetricOrder } from './domain'
import { ExerciseVisual } from './components/ExerciseVisual'
import { applyAppUpdate } from './pwa-update'
import { canShowInstallNudge, consumeCapturedInstallPrompt, getInstallPlatform, getManualInstallSteps, INSTALL_SNOOZE_DURATION_MS, INSTALL_SNOOZE_KEY, subscribeToInstallPrompt, type BeforeInstallPromptEvent, type InstallPlatform } from './pwa-install'
import { getAuthErrorMessage, useAuth } from './auth'
import { exerciseProgress, thisMonthCount, totalCompletedSets, workoutDurationMinutes } from './stats'
import { MAX_TIMELINE_PHOTOS, timelineImages, timelineMedia } from './timeline'
import type { ActivityCategory, AppSnapshot, Exercise, Feeling, MetricMode, Profile, TimelineEntry, Workout, WorkoutItem, WorkoutMetric, WorkoutSet, WorkoutTemplate } from './types'

const makeId = () => crypto.randomUUID()
const formatDay = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '')
const formatLongDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value))
const formatTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const emptySnapshot: AppSnapshot = { workouts: [], timeline: [], favorites: [], customExercises: [], customTemplates: [], profile: defaultProfile }
const BRAND_ICON_URL = `${import.meta.env.BASE_URL}brabita-icon-192.png`
const BACKUP_APP_ID = 'brabita'
const ACCEPTED_BACKUP_APP_IDS = new Set([BACKUP_APP_ID, 'treino-de-garota'])

type InstallRequestResult = 'accepted' | 'dismissed' | 'installed' | 'instructions'

type PwaInstallExperience = {
  installed: boolean
  promptAvailable: boolean
  platform: InstallPlatform
  requestInstall: () => Promise<InstallRequestResult>
}

function isAppRunningInstalled() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(iosNavigator.standalone)
}

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
  const [updateReady, setUpdateReady] = useState<{ target?: AppRelease }>()
  const [updateFlow, setUpdateFlow] = useState<UpdateFlow>(getInitialUpdateFlow)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>()
  const [showInstall, setShowInstall] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [appInstalled, setAppInstalled] = useState(() => isAppRunningInstalled())
  const installPlatform = getInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
  const location = useLocation()

  const refresh = async () => {
    setData(await loadSnapshot())
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const updateListener = (event: Event) => setUpdateReady((event as CustomEvent<{ target?: AppRelease }>).detail ?? {})
    const applyingListener = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: AppRelease }>).detail
      setUpdateFlow({ phase: 'applying', target: detail?.target })
    }
    const stalledListener = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      setUpdateFlow((current) => ({ ...current, phase: 'stalled', message: detail?.message }))
    }
    window.addEventListener('tg:update-ready', updateListener)
    window.addEventListener('tg:update-applying', applyingListener)
    window.addEventListener('tg:update-stalled', stalledListener)
    return () => {
      window.removeEventListener('tg:update-ready', updateListener)
      window.removeEventListener('tg:update-applying', applyingListener)
      window.removeEventListener('tg:update-stalled', stalledListener)
    }
  }, [])

  useEffect(() => {
    if (updateFlow.phase !== 'complete') return
    const timer = window.setTimeout(() => setUpdateFlow({ phase: 'idle' }), 1100)
    return () => window.clearTimeout(timer)
  }, [updateFlow.phase])

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const syncInstalledState = () => setAppInstalled(isAppRunningInstalled())
    if (isAppRunningInstalled()) return
    const canShow = () => canShowInstallNudge(localStorage.getItem(INSTALL_SNOOZE_KEY))
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      setInstallPrompt(event)
      if (canShow()) setShowInstall(true)
    }
    const onInstalled = () => {
      setAppInstalled(true)
      setInstallPrompt(undefined)
      setShowInstall(false)
      localStorage.removeItem(INSTALL_SNOOZE_KEY)
    }
    const unsubscribePrompt = subscribeToInstallPrompt(onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    displayMode.addEventListener('change', syncInstalledState)
    const timer = installPlatform === 'ios' && canShow() ? window.setTimeout(() => setShowInstall(true), 1400) : undefined
    return () => {
      unsubscribePrompt()
      window.removeEventListener('appinstalled', onInstalled)
      displayMode.removeEventListener('change', syncInstalledState)
      if (timer) window.clearTimeout(timer)
    }
  }, [installPlatform])

  const snoozeInstallNudge = () => {
    localStorage.setItem(INSTALL_SNOOZE_KEY, String(Date.now() + INSTALL_SNOOZE_DURATION_MS))
    setShowInstall(false)
  }

  const requestPwaInstall = async (): Promise<InstallRequestResult> => {
    if (appInstalled || isAppRunningInstalled()) {
      setAppInstalled(true)
      setShowInstall(false)
      return 'installed'
    }
    const prompt = installPrompt
    if (!prompt) return 'instructions'
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      consumeCapturedInstallPrompt(prompt)
      setInstallPrompt(undefined)
      setShowInstall(false)
      if (choice.outcome === 'dismissed') snoozeInstallNudge()
      return choice.outcome
    } catch {
      consumeCapturedInstallPrompt(prompt)
      setInstallPrompt(undefined)
      return 'instructions'
    }
  }

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const activeWorkout = data.workouts.find((workout) => workout.status === 'active')
  const showNav = !location.pathname.startsWith('/treino/ativo')
  const allExercises = useMemo(() => [...systemExercises, ...data.customExercises], [data.customExercises])
  const allTemplates = useMemo(() => [...systemTemplates, ...data.customTemplates], [data.customTemplates])

  if (updateFlow.phase !== 'idle') {
    return <AppUpdateScreen flow={updateFlow} onRetry={() => void applyAppUpdate(updateFlow.target)} />
  }

  if (loading) {
    return <main className="loading-screen"><img className="brand-logo" src={BRAND_ICON_URL} alt="" /><strong className="brand-name">Brabita</strong><p>Abrindo seu diário…</p></main>
  }

  if (!data.profile.onboarded) {
    return <Onboarding profile={data.profile} onDone={async (profile) => { await saveProfile(profile); await refresh() }} />
  }

  const installExperience: PwaInstallExperience = {
    installed: appInstalled,
    promptAvailable: Boolean(installPrompt),
    platform: installPlatform,
    requestInstall: requestPwaInstall,
  }
  const shared = { data, refresh, setNotice, allExercises, allTemplates, installExperience }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      {updateReady && (
        <div className="update-banner" role="status">
          <span>{updateReady.target ? `Versão ${updateReady.target.version} pronta.` : 'Uma versão nova está pronta.'}</span>
          <button onClick={() => void applyAppUpdate(updateReady.target)}>Atualizar</button>
        </div>
      )}
      {activeWorkout && !location.pathname.startsWith('/treino/ativo') && (
        <NavLink className="active-workout-bar" to="/treino/ativo">
          <span><span className="pulse-dot" /> treino em andamento</span>
          <span>continuar <ChevronRight size={17} /></span>
        </NavLink>
      )}
      {showInstall && <aside className={`install-nudge ${showNav ? '' : 'during-workout'}`} aria-label="Instalar aplicativo">
        <img className="install-mark" src={BRAND_ICON_URL} alt="" />
        <div><strong>levar o diário com você</strong><p>{showIosHelp ? getManualInstallSteps(installPlatform).join(' ') : 'Instale para abrir rápido e usar offline.'}</p></div>
        {!showIosHelp && <button className="install-action" onClick={async () => {
          const result = await requestPwaInstall()
          if (result === 'instructions') setShowIosHelp(true)
        }}>instalar</button>}
        <button className="install-later" onClick={snoozeInstallNudge}>lembrar mais tarde</button>
      </aside>}
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
  allTemplates: WorkoutTemplate[]
  installExperience: PwaInstallExperience
}

function Onboarding({ profile, onDone }: { profile: Profile; onDone: (profile: Profile) => Promise<void> }) {
  const [unit, setUnit] = useState<Profile['loadUnit']>(profile.loadUnit)
  const [busy, setBusy] = useState(false)
  return (
    <main className="onboarding">
      <div className="onboarding-mark"><img className="brand-logo" src={BRAND_ICON_URL} alt="" /><span className="brand-name">Brabita</span></div>
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
      <p className="privacy-note"><Info size={16} /> Seu diário fica neste aparelho e é separado pela sua conta.</p>
    </main>
  )
}

function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  const waveVariant = title === 'hoje' ? 'one' : title === 'minha linha' ? 'two' : title === 'biblioteca' ? 'three' : title === 'evolução' ? 'four' : 'five'
  return <header className={`page-header wave-${waveVariant}`}><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>{action}</header>
}

function TodayPage({ data, refresh, allExercises, allTemplates }: SharedProps) {
  const navigate = useNavigate()
  const completed = data.workouts.filter((workout) => workout.status === 'completed')
  const active = data.workouts.find((workout) => workout.status === 'active')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite'
  const monthCount = thisMonthCount(data.workouts)

  const startWorkout = async (repeat?: Workout, template?: WorkoutTemplate) => {
    if (active) return navigate('/treino/ativo')
    const templateItems = template?.exerciseIds.map((exerciseId) => allExercises.find((exercise) => exercise.id === exerciseId)).filter((exercise): exercise is Exercise => Boolean(exercise))
    const workout: Workout = {
      id: makeId(),
      title: repeat?.title ?? template?.name ?? 'Treino de hoje',
      status: 'active',
      startedAt: new Date().toISOString(),
      restSeconds: repeat?.restSeconds ?? 90,
      items: repeat?.items.map((item) => ({
        id: makeId(), exerciseId: item.exerciseId, exerciseName: item.exerciseName, category: item.category, metricMode: item.metricMode,
        metrics: item.metrics ?? defaultMetricsForMode(item.metricMode),
        sets: [{ id: makeId(), completed: false }],
      })) ?? templateItems?.map((exercise) => ({ id: makeId(), exerciseId: exercise.id, exerciseName: exercise.name, category: exercise.category, metricMode: exercise.metricMode, metrics: defaultMetricsForMode(exercise.metricMode), sets: [{ id: makeId(), completed: false }] })) ?? [],
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

      {!active && <section className="template-shortcuts" aria-labelledby="template-shortcuts-title">
        <div className="section-heading"><div><p className="eyebrow">para começar mais rápido</p><h2 id="template-shortcuts-title">modelos de treino</h2></div><NavLink to="/exercicios">ver todos</NavLink></div>
        <div className="template-scroll">{allTemplates.slice(0, 4).map((template) => <button key={template.id} onClick={() => void startWorkout(undefined, template)}><strong>{template.name}</strong><small>{template.note}</small><Play size={16} /></button>)}</div>
      </section>}

      <section className="at-a-glance" aria-labelledby="glance-title">
        <div className="section-heading"><div><p className="eyebrow">um olhar rápido</p><h2 id="glance-title">seu ritmo</h2></div></div>
        <div className="glance-grid">
          <div><strong>{monthCount}</strong><span>{monthCount === 1 ? 'treino este mês' : 'treinos este mês'}</span></div>
          <div><strong>{totalCompletedSets(data.workouts)}</strong><span>registros concluídos</span></div>
        </div>
      </section>

      <section className="recent-section" aria-labelledby="recent-title">
        <div className="section-heading"><h2 id="recent-title">últimos treinos</h2>{completed.length > 0 && <NavLink to="/linha">ver na linha</NavLink>}</div>
        {completed.length === 0 ? (
          <div className="empty-gentle"><NotebookPen size={22} /><p>Quando você finalizar um treino, ele aparece aqui.</p></div>
        ) : completed.slice(0, 3).map((workout) => (
          <NavLink className="workout-row" to={`/treino/${workout.id}`} key={workout.id}>
            <span className="workout-date">{formatDay(workout.endedAt ?? workout.startedAt)}</span>
            <span><strong>{workout.title}</strong><small>{workout.items.length} {workout.items.length === 1 ? 'atividade' : 'atividades'} · {workoutDurationMinutes(workout)} min</small></span>
            <ChevronRight size={18} />
          </NavLink>
        ))}
      </section>
      <p className="little-note"><span>✦</span> voltar também faz parte</p>
    </div>
  )
}

function WorkoutPage({ data, refresh, setNotice, allExercises, allTemplates }: SharedProps) {
  const navigate = useNavigate()
  const active = data.workouts.find((workout) => workout.status === 'active')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'exercise' | 'template'>('exercise')
  const [query, setQuery] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [feeling, setFeeling] = useState<Feeling | undefined>()
  const [section, setSection] = useState<'strength' | 'activities'>('strength')
  const [restOpen, setRestOpen] = useState(false)
  const [finishConfirm, setFinishConfirm] = useState(false)
  const [abandonConfirm, setAbandonConfirm] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  useEffect(() => {
    if (!pickerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.exercise-picker-sheet .icon-button')?.focus())
    return () => { window.cancelAnimationFrame(focusFrame); document.body.style.overflow = previous }
  }, [pickerOpen])

  if (!active) return <SimpleEmpty icon={<Dumbbell />} title="Nenhum treino em andamento" action={<button className="primary-button" onClick={() => navigate('/')}>voltar para hoje</button>} />

  const persist = async (next: Workout) => { await db.workouts.put(next); await refresh() }
  const updateItem = async (itemId: string, fn: (item: WorkoutItem) => WorkoutItem) => {
    const latest = await db.workouts.get(active.id) ?? active
    await db.workouts.put({ ...latest, items: latest.items.map((item) => item.id === itemId ? fn(item) : item) })
    await refresh()
  }
  const openPicker = () => { setPickerMode('exercise'); setQuery(''); setPickerOpen(true) }
  const closePicker = () => { setPickerOpen(false); setQuery('') }
  const toWorkoutItem = (exercise: Exercise): WorkoutItem => ({
    id: makeId(), exerciseId: exercise.id, exerciseName: exercise.name, category: exercise.category, metricMode: exercise.metricMode,
    metrics: defaultMetricsForMode(exercise.metricMode),
    sets: [{ id: makeId(), completed: false }],
  })
  const addExercise = async (exercise: Exercise) => {
    const latest = await db.workouts.get(active.id) ?? active
    await persist({ ...latest, items: [...latest.items, toWorkoutItem(exercise)] })
    closePicker()
  }
  const addTemplate = async (template: WorkoutTemplate) => {
    const latest = await db.workouts.get(active.id) ?? active
    const existing = new Set(latest.items.map((item) => item.exerciseId))
    const additions = template.exerciseIds
      .map((id) => allExercises.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => Boolean(exercise))
      .filter((exercise) => !existing.has(exercise.id))
      .map(toWorkoutItem)
    if (additions.length === 0) { setNotice('Os exercícios deste modelo já estão no treino.'); return }
    await persist({ ...latest, items: [...latest.items, ...additions] })
    const currentCategory = section === 'strength' ? 'strength' : 'activities'
    const hasCurrentCategory = additions.some((item) => currentCategory === 'strength' ? item.category === 'strength' : item.category !== 'strength')
    if (!hasCurrentCategory) setSection(additions[0].category === 'strength' ? 'strength' : 'activities')
    closePicker()
    setNotice(`${template.name} adicionado ao treino.`)
  }
  const updateSet = async (itemId: string, setId: string, patch: Partial<WorkoutSet>) => {
    await updateItem(itemId, (item) => ({ ...item, sets: item.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }))
  }
  const toggleMetric = async (itemId: string, metric: WorkoutMetric) => {
    const item = (await db.workouts.get(active.id) ?? active).items.find((candidate) => candidate.id === itemId)
    if (!item) return
    const current = item.metrics ?? defaultMetricsForMode(item.metricMode)
    if (current.includes(metric) && current.length === 1) {
      setNotice('Mantenha ao menos uma medida para concluir o registro.')
      return
    }
    const next = current.includes(metric)
      ? current.filter((candidate) => candidate !== metric)
      : workoutMetricOrder.filter((candidate) => current.includes(candidate) || candidate === metric)
    await updateItem(itemId, (candidate) => ({ ...candidate, metrics: next }))
  }
  const completeSet = async (itemId: string, set: WorkoutSet) => {
    const latestWorkout = await db.workouts.get(active.id) ?? active
    const item = latestWorkout.items.find((row) => row.id === itemId)
    const latestSet = item?.sets.find((row) => row.id === set.id)
    if (!item || !latestSet) return
    if (!latestSet.completed && !isSetValidForMetrics(latestSet, item.metrics ?? defaultMetricsForMode(item.metricMode))) {
      setNotice(item.category === 'strength' ? 'Preencha os valores obrigatórios acima de zero.' : 'Preencha os dados da atividade acima de zero.')
      return
    }
    await db.workouts.put({ ...latestWorkout, items: latestWorkout.items.map((row) => row.id === itemId ? { ...row, sets: row.sets.map((entry) => entry.id === latestSet.id ? { ...entry, completed: !entry.completed } : entry) } : row) })
    await refresh()
    if (!latestSet.completed && item.category === 'strength') setSeconds(latestWorkout.restSeconds ?? 90)
  }
  const askToFinish = async () => {
    const latest = await db.workouts.get(active.id) ?? active
    if (!latest.items.some((item) => item.sets.some((set) => set.completed))) {
      setNotice('Conclua ao menos uma série ou registro antes de finalizar.')
      return
    }
    setFinishConfirm(true)
  }
  const finish = async () => {
    setActionBusy(true)
    const latest = await db.workouts.get(active.id) ?? active
    const endedAt = new Date().toISOString()
    const completedWorkout = { ...latest, status: 'completed' as const, endedAt, feeling }
    const exerciseCount = latest.items.filter((item) => item.sets.some((set) => set.completed)).length
    const setCount = latest.items.reduce((sum, item) => sum + item.sets.filter((set) => set.completed).length, 0)
    const includesActivities = latest.items.some((item) => item.category !== 'strength' && item.sets.some((set) => set.completed))
    const entry: TimelineEntry = {
      id: makeId(), kind: 'workout', occurredAt: endedAt, title: latest.title,
      text: `${exerciseCount} ${exerciseCount === 1 ? 'atividade' : 'atividades'} · ${setCount} ${includesActivities ? (setCount === 1 ? 'registro' : 'registros') : (setCount === 1 ? 'série' : 'séries')}`,
      sourceId: latest.id, isMilestone: false,
    }
    await db.transaction('rw', [db.workouts, db.timeline], async () => { await db.workouts.put(completedWorkout); await db.timeline.put(entry) })
    await refresh()
    setActionBusy(false)
    setFinishConfirm(false)
    setNotice('Treino guardado na sua linha.')
    navigate('/linha')
  }
  const abandon = async () => {
    setActionBusy(true)
    await db.workouts.delete(active.id)
    await refresh()
    setActionBusy(false)
    setAbandonConfirm(false)
    navigate('/')
  }
  const filtered = allExercises.filter((exercise) => {
    const inSection = section === 'strength' ? exercise.category === 'strength' : exercise.category !== 'strength'
    return inSection && `${exercise.name} ${exercise.aliases.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  }).slice(0, 18)
  const filteredTemplates = allTemplates.filter((template) => {
    const exerciseNames = template.exerciseIds.map((id) => allExercises.find((exercise) => exercise.id === id)?.name ?? '').join(' ')
    return `${template.name} ${template.note} ${exerciseNames}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  })
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60000))
  const visibleItems = active.items.filter((item) => section === 'strength' ? item.category === 'strength' : item.category !== 'strength')
  const strengthCount = active.items.filter((item) => item.category === 'strength').length
  const activityCount = active.items.length - strengthCount
  const completedItemCount = active.items.filter((item) => item.sets.some((set) => set.completed)).length
  const completedSetCount = active.items.reduce((sum, item) => sum + item.sets.filter((set) => set.completed).length, 0)

  return (
    <div className="workout-page">
      <header className="workout-topbar">
        <button className="icon-button" aria-label="Voltar" onClick={() => navigate('/')}><ArrowLeft /></button>
        <div><p>treino em andamento</p><strong>{elapsed < 1 ? 'agora' : `${elapsed} min`}</strong></div>
        <button className="stop-workout-button" aria-label="Parar ou cancelar treino" title="Parar ou cancelar treino" onClick={() => setAbandonConfirm(true)}><Square size={18} fill="currentColor" /></button>
      </header>
      <div className="workout-title-wrap">
        <input className="workout-title" aria-label="Nome do treino" value={active.title} onChange={(event) => void persist({ ...active, title: event.target.value })} />
        <span className="pink-swoop" />
      </div>

      <div className="workout-sections" role="tablist" aria-label="Tipo de atividade">
        <button role="tab" aria-selected={section === 'strength'} className={section === 'strength' ? 'selected' : ''} onClick={() => { setSection('strength'); setQuery('') }}><Dumbbell size={17} /><span>musculação</span><small>{strengthCount}</small></button>
        <button role="tab" aria-selected={section === 'activities'} className={section === 'activities' ? 'selected' : ''} onClick={() => { setSection('activities'); setQuery('') }}><Clock3 size={17} /><span>cardio e outras</span><small>{activityCount}</small></button>
      </div>

      {section === 'strength' && <div className="rest-preference"><button onClick={() => setRestOpen(!restOpen)} aria-expanded={restOpen}><Clock3 size={16} /> descanso {formatTimer(active.restSeconds ?? 90)} <SlidersHorizontal size={15} /></button>{restOpen && <div className="rest-options" aria-label="Tempo de descanso">{[45, 60, 90, 120, 180].map((value) => <button className={(active.restSeconds ?? 90) === value ? 'selected' : ''} key={value} onClick={() => void persist({ ...active, restSeconds: value })}>{formatTimer(value)}</button>)}</div>}</div>}

      {visibleItems.length === 0 ? (
        <div className="workout-empty">
          <button className="workout-add-plus" aria-label={section === 'strength' ? 'Adicionar exercício' : 'Adicionar cardio ou atividade'} onClick={openPicker}><Plus size={29} /></button>
          <h2>{section === 'strength' ? 'Qual foi o primeiro?' : 'Algum cardio ou atividade?'}</h2>
          <p>{section === 'strength' ? 'Toque no + para começar a registrar.' : 'Tempo e distância ficam separados da musculação.'}</p>
        </div>
      ) : <>
        {visibleItems.map((item, itemIndex) => (
          <section className="exercise-block" key={item.id} aria-labelledby={`exercise-${item.id}`}>
            <div className="exercise-block-title"><span>{String(itemIndex + 1).padStart(2, '0')}</span><h2 id={`exercise-${item.id}`}>{item.exerciseName}</h2><button className="icon-button small" aria-label={`Remover ${item.exerciseName}`} onClick={() => void persist({ ...active, items: active.items.filter((row) => row.id !== item.id) })}><X /></button></div>
            <MetricSelector item={item} unit={data.profile.loadUnit} onToggle={(metric) => void toggleMetric(item.id, metric)} />
            <div className="set-head"><span>{item.category === 'strength' ? 'série' : 'reg.'}</span><MetricLabels metrics={item.metrics ?? defaultMetricsForMode(item.metricMode)} unit={data.profile.loadUnit} /><span>feito</span><span aria-hidden="true" /></div>
            {item.sets.map((set, setIndex) => (
              <div className={set.completed ? 'set-row completed' : 'set-row'} key={set.id}>
                <span className="set-number">{setIndex + 1}</span>
                <MetricFields metrics={item.metrics ?? defaultMetricsForMode(item.metricMode)} unit={data.profile.loadUnit} set={set} index={setIndex} onCommit={(patch) => void updateSet(item.id, set.id, patch)} />
                <button className="set-check" aria-label={set.completed ? `Reabrir ${item.category === 'strength' ? 'série' : 'registro'} ${setIndex + 1}` : `Concluir ${item.category === 'strength' ? 'série' : 'registro'} ${setIndex + 1}`} aria-pressed={set.completed} onClick={() => void completeSet(item.id, set)}>{set.completed && <Check size={19} />}</button>
                <button className="remove-set" aria-label={`Excluir ${item.category === 'strength' ? 'série' : 'registro'} ${setIndex + 1}`} onClick={() => void updateItem(item.id, (row) => ({ ...row, sets: row.sets.filter((entry) => entry.id !== set.id) }))}><Trash2 size={16} /></button>
              </div>
            ))}
            <button className="add-set" onClick={() => void updateItem(item.id, (row) => ({ ...row, sets: [...row.sets, { ...row.sets.at(-1), id: makeId(), completed: false }] }))}><Plus size={17} /> adicionar {item.category === 'strength' ? 'série' : 'registro'}</button>
            <ExerciseNoteInput itemId={item.id} exerciseName={item.exerciseName} value={item.note} onCommit={(value) => void updateItem(item.id, (row) => ({ ...row, note: value }))} />
          </section>
        ))}
        <button className="workout-add-plus after-list" aria-label={section === 'strength' ? 'Adicionar outro exercício' : 'Adicionar outra atividade'} onClick={openPicker}><Plus size={26} /></button>
      </>}

      {seconds > 0 && <div className="rest-timer"><Clock3 size={18} /><span>descanso</span><button aria-label="Diminuir descanso em 15 segundos" onClick={() => setSeconds((value) => Math.max(15, value - 15))}>−15</button><strong>{formatTimer(seconds)}</strong><button aria-label="Aumentar descanso em 15 segundos" onClick={() => setSeconds((value) => value + 15)}>+15</button><button aria-label="Encerrar descanso" onClick={() => setSeconds(0)}><X size={17} /></button></div>}
      <section className="finish-area">
        <p>como foi hoje? <span>opcional</span></p>
        <div className="feeling-row">
          {(['leve', 'normal', 'intenso'] as Feeling[]).map((value) => <button className={feeling === value ? 'selected' : ''} key={value} onClick={() => setFeeling(feeling === value ? undefined : value)}>{value}</button>)}
        </div>
        <button className="primary-button wide" onClick={() => void askToFinish()}><Check size={19} /> finalizar treino</button>
      </section>

      {pickerOpen && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closePicker() }}><section className="bottom-sheet exercise-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div className="sheet-handle" /><header><h2 id="picker-title">adicionar ao treino</h2><button className="icon-button" aria-label="Fechar" onClick={closePicker}><X /></button></header><div className="picker-tabs" role="tablist" aria-label="O que adicionar"><button role="tab" aria-selected={pickerMode === 'exercise'} className={pickerMode === 'exercise' ? 'selected' : ''} onClick={() => { setPickerMode('exercise'); setQuery('') }}>exercício</button><button role="tab" aria-selected={pickerMode === 'template'} className={pickerMode === 'template' ? 'selected' : ''} onClick={() => { setPickerMode('template'); setQuery('') }}>modelo</button></div><label className="search-field"><Search size={19} /><input placeholder={pickerMode === 'exercise' ? (section === 'strength' ? 'buscar exercício' : 'buscar cardio ou atividade') : 'buscar modelo'} value={query} onChange={(event) => setQuery(event.target.value)} /></label>{pickerMode === 'exercise' ? <div className="picker-list" tabIndex={-1}>{filtered.map((exercise) => <button key={exercise.id} onClick={() => void addExercise(exercise)}><ExerciseVisual visual={exercise.visual} label={exercise.name} compact /><span><strong>{exercise.name}</strong><small>{exercise.group} · {exercise.equipment}</small></span><Plus size={19} /></button>)}</div> : <div className="picker-list picker-template-list" tabIndex={-1}>{filteredTemplates.map((template) => <button key={template.id} onClick={() => void addTemplate(template)}><span className="template-picker-mark" /><span><strong>{template.name}</strong><small>{template.note}</small><em>{template.exerciseIds.slice(0, 3).map((id) => allExercises.find((exercise) => exercise.id === id)?.name).filter(Boolean).join(' · ')}</em></span><Plus size={19} /></button>)}</div>}</section></div>}

      <ConfirmDialog open={finishConfirm} title="guardar este treino?" confirmLabel="guardar treino" onClose={() => setFinishConfirm(false)} onConfirm={() => void finish()} busy={actionBusy}>
        <p>Confira o que vai entrar na sua linha.</p>
        <div className="workout-confirm-summary"><strong>{elapsed < 1 ? 'menos de 1 min' : `${elapsed} min`}</strong><span>{completedItemCount} {completedItemCount === 1 ? 'atividade' : 'atividades'}</span><span>{completedSetCount} {completedSetCount === 1 ? 'registro concluído' : 'registros concluídos'}</span>{feeling && <span>sensação: {feeling}</span>}</div>
      </ConfirmDialog>
      <ConfirmDialog open={abandonConfirm} title="apagar este treino?" confirmLabel="apagar treino" tone="danger" onClose={() => setAbandonConfirm(false)} onConfirm={() => void abandon()} busy={actionBusy}>
        <p>As séries e atividades deste treino em andamento serão removidas deste aparelho.</p>
      </ConfirmDialog>
    </div>
  )
}

function metricLabel(metric: WorkoutMetric, unit: Profile['loadUnit'], compact = false) {
  if (metric === 'load') return compact ? `carga ${unit}` : `carga (${unit})`
  if (metric === 'reps') return compact ? 'reps' : 'repetições'
  if (metric === 'distance') return compact ? 'distância' : 'distância (km)'
  return compact ? 'tempo' : 'tempo (min)'
}

function MetricSelector({ item, unit, onToggle }: { item: WorkoutItem; unit: Profile['loadUnit']; onToggle: (metric: WorkoutMetric) => void }) {
  const metrics = item.metrics ?? defaultMetricsForMode(item.metricMode)
  return <details className="metric-selector"><summary><SlidersHorizontal size={15} /><span>o que registrar</span><small>{metrics.map((metric) => metricLabel(metric, unit, true)).join(' · ')}</small></summary><div className="metric-options" role="group" aria-label={`Métricas de ${item.exerciseName}`}>{workoutMetricOrder.map((metric) => {
    const selected = metrics.includes(metric)
    return <button type="button" key={metric} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => onToggle(metric)}>{selected ? <Check size={15} /> : <Plus size={15} />}{metricLabel(metric, unit, true)}</button>
  })}</div></details>
}

function MetricLabels({ metrics, unit }: { metrics: WorkoutMetric[]; unit: Profile['loadUnit'] }) {
  return <span className={`metric-labels metrics-${metrics.length}`}>{metrics.map((metric) => <span key={metric}>{metricLabel(metric, unit)}</span>)}</span>
}

function MetricFields({ metrics, unit, set, index, onCommit }: { metrics: WorkoutMetric[]; unit: Profile['loadUnit']; set: WorkoutSet; index: number; onCommit: (patch: Partial<WorkoutSet>) => void }) {
  type SetMetricKey = 'load' | 'reps' | 'distanceKm' | 'durationMinutes'
  const fields: Array<{ key: SetMetricKey; value?: number; label: string }> = metrics.map((metric) => {
    if (metric === 'load') return { key: 'load', value: set.load, label: `Carga do registro ${index + 1} em ${unit}` }
    if (metric === 'reps') return { key: 'reps', value: set.reps, label: `Repetições do registro ${index + 1}` }
    if (metric === 'distance') return { key: 'distanceKm', value: set.distanceKm, label: `Distância do registro ${index + 1} em quilômetros` }
    return { key: 'durationMinutes', value: set.durationMinutes, label: `Tempo do registro ${index + 1} em minutos` }
  })
  return <span className={`metric-inputs metrics-${fields.length}`}>{fields.map((field) => <LocalizedNumberInput key={field.key} value={field.value} label={field.label} onCommit={(value) => onCommit({ [field.key]: value })} />)}</span>
}

function ExerciseNoteInput({ itemId, exerciseName, value, onCommit }: { itemId: string; exerciseName: string; value?: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const commitTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(value ?? '')
  }, [itemId, value])

  useEffect(() => () => window.clearTimeout(commitTimer.current), [])

  const commit = (next: string) => {
    window.clearTimeout(commitTimer.current)
    onCommit(next)
  }

  return <textarea ref={inputRef} rows={1} className="note-input" aria-label={`Observação sobre ${exerciseName}`} placeholder="uma observação, se quiser…" value={draft} onChange={(event) => {
    const next = event.target.value
    setDraft(next)
    window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => onCommit(next), 450)
  }} onBlur={() => commit(draft)} />
}

function LocalizedNumberInput({ value, label, onCommit }: { value?: number; label: string; onCommit: (value?: number) => void }) {
  const [raw, setRaw] = useState(formatLocalizedNumber(value))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => setRaw(formatLocalizedNumber(value)), [value])
  const commit = () => {
    if (!raw.trim()) { setInvalid(false); onCommit(undefined); return }
    const parsed = parseLocalizedNumber(raw)
    setInvalid(parsed === undefined)
    if (parsed !== undefined) { setRaw(formatLocalizedNumber(parsed)); onCommit(parsed) } else onCommit(undefined)
  }
  return <span className="number-field"><input inputMode="decimal" aria-label={label} aria-invalid={invalid} value={raw} placeholder="—" onChange={(event) => { const next = event.target.value; const parsed = parseLocalizedNumber(next); setRaw(next); setInvalid(false); if (parsed !== undefined) onCommit(parsed); else if (!next.trim()) onCommit(undefined) }} onBlur={commit} /><small className="field-error">{invalid ? 'maior que 0' : ''}</small></span>
}

function formatTimer(value: number) {
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

function TimelinePage({ data, refresh, setNotice }: SharedProps) {
  const [composer, setComposer] = useState(false)
  const [note, setNote] = useState('')
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoProgress, setPhotoProgress] = useState({ current: 0, total: 0 })
  const [filter, setFilter] = useState<'all' | 'milestones' | 'media'>('all')
  const [selectedEntryId, setSelectedEntryId] = useState<string>()
  const [selectedMediaId, setSelectedMediaId] = useState<string>()
  const visible = data.timeline.filter((entry) => filter === 'all' || (filter === 'milestones' && entry.isMilestone))
  const media = useMemo(() => timelineMedia(data.timeline), [data.timeline])
  const selectedEntry = data.timeline.find((entry) => entry.id === selectedEntryId)

  useEffect(() => {
    if (!composer) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.composer .icon-button')?.focus())
    return () => { window.cancelAnimationFrame(focusFrame); document.body.style.overflow = previous }
  }, [composer])

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    const remaining = MAX_TIMELINE_PHOTOS - imageDataUrls.length
    event.target.value = ''
    if (selectedFiles.length === 0) return
    if (remaining <= 0) { setNotice('Você já escolheu o limite de 5 fotos.'); return }

    const supported = selectedFiles.filter((file) => isSupportedImage(file) && file.size <= 20_000_000)
    const files = supported.slice(0, remaining)
    if (files.length === 0) { setNotice('Use fotos de até 20 MB em JPG, PNG, WebP, AVIF ou HEIC.'); return }

    setPhotoBusy(true)
    setPhotoProgress({ current: 0, total: files.length })
    const processed: string[] = []
    let failed = selectedFiles.length - supported.length
    try {
      for (const [index, file] of files.entries()) {
        setPhotoProgress({ current: index + 1, total: files.length })
        try {
          const image = await compressImage(file)
          await ensureImageLoads(image)
          processed.push(image)
        } catch {
          failed += 1
        }
      }
      if (processed.length > 0) setImageDataUrls((current) => [...current, ...processed].slice(0, MAX_TIMELINE_PHOTOS))
      const overLimit = supported.length > remaining
      if (failed > 0) setNotice(`${processed.length} ${processed.length === 1 ? 'foto ficou pronta' : 'fotos ficaram prontas'}; ${failed} não ${failed === 1 ? 'pôde' : 'puderam'} ser convertida${failed === 1 ? '' : 's'}.`)
      else if (overLimit) setNotice(`Fotos prontas. Cada registro pode ter até ${MAX_TIMELINE_PHOTOS}.`)
      else setNotice(processed.length === 1 ? 'Foto pronta para guardar.' : `${processed.length} fotos prontas para guardar.`)
    } finally {
      setPhotoBusy(false)
      setPhotoProgress({ current: 0, total: 0 })
    }
  }
  const saveEntry = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim() && imageDataUrls.length === 0) return
    const entry: TimelineEntry = { id: makeId(), kind: imageDataUrls.length > 0 ? 'photo' : 'note', occurredAt: new Date().toISOString(), title: imageDataUrls.length > 0 ? 'Um registro de hoje' : 'Nota de hoje', text: note.trim(), imageDataUrls, isMilestone: false }
    try {
      await db.timeline.put(entry)
      const saved = await db.timeline.get(entry.id)
      const savedImages = saved ? timelineImages(saved) : []
      if (!saved || savedImages.length !== imageDataUrls.length) {
        await db.timeline.delete(entry.id)
        throw new Error('photo-not-persisted')
      }
      for (const image of savedImages) {
        try {
          await ensureImageLoads(image)
        } catch {
          await db.timeline.delete(entry.id)
          throw new Error('photo-invalid-after-save')
        }
      }
      await refresh(); setNote(''); setImageDataUrls([]); setComposer(false); setNotice('Guardado na sua linha.')
    } catch (error) {
      const quotaReached = error instanceof DOMException && error.name === 'QuotaExceededError'
      setNotice(quotaReached ? 'Não há espaço suficiente neste aparelho para guardar a foto.' : 'Não conseguimos guardar a foto. Seus outros registros continuam salvos.')
    }
  }

  return (
    <div className="page timeline-page">
      <PageHeader eyebrow="só sua" title="minha linha" />
      <div className="filter-row" role="tablist" aria-label="Ver registros da linha"><button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>tudo</button><button role="tab" aria-selected={filter === 'milestones'} className={filter === 'milestones' ? 'selected' : ''} onClick={() => setFilter('milestones')}>marcos</button><button role="tab" aria-selected={filter === 'media'} className={filter === 'media' ? 'selected' : ''} onClick={() => setFilter('media')}>mídia</button></div>
      {filter === 'media' ? <TimelineMediaGallery items={media} entries={data.timeline} onOpen={setSelectedMediaId} /> : visible.length === 0 ? <SimpleEmpty icon={<NotebookPen />} title={filter === 'milestones' ? 'Nenhum marco ainda' : 'Sua linha começa aqui'} text={filter === 'milestones' ? 'Você escolhe o que merece ficar em destaque.' : 'Use o + para guardar notas e fotos na sua história.'} /> : (
        <div className="timeline-rail">
          {visible.map((entry) => <TimelineItem key={entry.id} entry={entry} onOpen={() => setSelectedEntryId(entry.id)} refresh={refresh} setNotice={setNotice} />)}
        </div>
      )}
      <FloatingAddButton tone="pink" label="Adicionar à linha" onClick={() => setComposer(true)} />
      <TimelineDetailDialog entry={selectedEntry} workout={selectedEntry?.sourceId ? data.workouts.find((workout) => workout.id === selectedEntry.sourceId) : undefined} loadUnit={data.profile.loadUnit} onClose={() => setSelectedEntryId(undefined)} />
      {selectedMediaId && <TimelineMediaViewer key={selectedMediaId} items={media} entries={data.timeline} activeId={selectedMediaId} onClose={() => setSelectedMediaId(undefined)} />}
      {composer && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !photoBusy) setComposer(false) }}><form className="bottom-sheet composer" onSubmit={(event) => void saveEntry(event)}><div className="sheet-handle" /><header><div><h2>guardar na linha</h2><p className="composer-count">{imageDataUrls.length} de {MAX_TIMELINE_PHOTOS} fotos</p></div><button type="button" className="icon-button" aria-label="Fechar" disabled={photoBusy} onClick={() => setComposer(false)}><X /></button></header>{photoBusy && <div className="photo-processing" role="status">preparando foto {photoProgress.current} de {photoProgress.total}…</div>}{imageDataUrls.length > 0 && <div className={`composer-previews count-${imageDataUrls.length}`}>{imageDataUrls.map((source, index) => <div className="photo-ready" key={`${source.slice(-24)}-${index}`}><img className="composer-preview" src={source} alt={`Prévia da foto ${index + 1}`} onError={() => { setImageDataUrls((current) => current.filter((_, itemIndex) => itemIndex !== index)); setNotice('Uma foto não pôde ser exibida e foi removida.') }} /><button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => setImageDataUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={17} /></button></div>)}</div>}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que você quer lembrar?" aria-label="Anotação" /><div className="composer-actions"><label className={`secondary-button file-button ${imageDataUrls.length >= MAX_TIMELINE_PHOTOS ? 'disabled' : ''}`}><ImagePlus size={18} /> {imageDataUrls.length > 0 ? 'adicionar fotos' : 'escolher fotos'}<input type="file" multiple disabled={photoBusy || imageDataUrls.length >= MAX_TIMELINE_PHOTOS} accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/heic-sequence,image/heif-sequence,.heic,.heif" onChange={(event) => void choosePhoto(event)} /></label><button className="primary-button" disabled={photoBusy || (!note.trim() && imageDataUrls.length === 0)}>guardar</button></div><p className="privacy-note"><Info size={15} /> Até 5 fotos, otimizadas e guardadas neste aparelho.</p></form></div>}
    </div>
  )
}

function TimelineItem({ entry, onOpen, refresh, setNotice }: { entry: TimelineEntry; onOpen: () => void; refresh: () => Promise<void>; setNotice: (message: string) => void }) {
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const images = timelineImages(entry)
  const toggleMilestone = async () => { await db.timeline.put({ ...entry, isMilestone: !entry.isMilestone }); await refresh(); setNotice(entry.isMilestone ? 'Marco removido.' : 'Virou um marco seu.') }
  const remove = async () => { await db.timeline.delete(entry.id); await refresh(); setNotice('Registro removido.') }
  return (
    <article className={`timeline-entry ${entry.isMilestone ? 'milestone' : ''}`}>
      <div className="timeline-dot">{entry.kind === 'workout' ? <Dumbbell size={16} /> : entry.kind === 'photo' ? <ImagePlus size={16} /> : <PencilLine size={16} />}</div>
      <div className="timeline-date"><strong>{formatDay(entry.occurredAt)}</strong><span>{formatTime(entry.occurredAt)}</span></div>
      <div className="timeline-content">
        <button className="timeline-open" onClick={onOpen} aria-label={`Abrir detalhes de ${entry.title}`}>
          {entry.isMilestone && <span className="milestone-label"><Star size={14} fill="currentColor" /> meu marco</span>}
          <h2>{entry.title}</h2>
          {entry.text && <p>{entry.text}</p>}
          {images.length > 0 && <TimelineMediaCollage images={images} text={entry.text} />}
          <span className="open-detail-hint">ver detalhes <ChevronRight size={15} /></span>
        </button>
        <div className="entry-actions"><button onClick={() => void toggleMilestone()}><Star size={16} fill={entry.isMilestone ? 'currentColor' : 'none'} /> {entry.isMilestone ? 'desmarcar' : 'marcar'}</button><button onClick={() => setRemoveConfirm(true)}><Trash2 size={16} /> remover</button></div>
      </div>
      <ConfirmDialog open={removeConfirm} title="remover da sua linha?" confirmLabel="remover registro" tone="danger" onClose={() => setRemoveConfirm(false)} onConfirm={() => void remove()}><p>Este registro será apagado deste aparelho.</p></ConfirmDialog>
    </article>
  )
}

function TimelineMediaCollage({ images, text, variant = 'summary' }: { images: string[]; text?: string; variant?: 'summary' | 'detail' }) {
  return <div className={`timeline-collage count-${images.length} ${variant}`}>{images.map((source, index) => <TimelineImage key={`${source.slice(-24)}-${index}`} source={source} alt={text ? `Foto ${index + 1}: ${text}` : `Foto pessoal ${index + 1} sem descrição`} />)}</div>
}

function TimelineRecordMedia({ images, text }: { images: string[]; text?: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  useEffect(() => setSelectedIndex((value) => Math.min(value, images.length - 1)), [images.length])
  const selected = images[selectedIndex] ?? images[0]
  const selectedAlt = text ? `Foto ${selectedIndex + 1}: ${text}` : `Foto pessoal ${selectedIndex + 1} sem descrição`
  return <section className="timeline-record-media" aria-label={`${images.length} ${images.length === 1 ? 'foto' : 'fotos'} deste registro`}>
    <div className="timeline-featured-photo"><TimelineImage source={selected} alt={selectedAlt} /></div>
    {images.length > 1 && <div className={`timeline-photo-strip count-${images.length}`} aria-label="Escolher foto em destaque">{images.map((source, index) => <button type="button" key={`${source.slice(-24)}-${index}`} className={selectedIndex === index ? 'selected' : ''} aria-label={`Destacar foto ${index + 1} de ${images.length}`} aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}><TimelineImage source={source} alt="" /></button>)}</div>}
  </section>
}

function TimelineImage({ source, alt }: { source: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [source])
  return <span className="timeline-photo-tile">{failed ? <span className="photo-unavailable"><ImagePlus size={20} /><span>Foto indisponível</span></span> : <img src={source} alt={alt} loading="lazy" onError={() => setFailed(true)} />}</span>
}

function TimelineMediaGallery({ items, entries, onOpen }: { items: ReturnType<typeof timelineMedia>; entries: TimelineEntry[]; onOpen: (mediaId: string) => void }) {
  if (items.length === 0) return <SimpleEmpty icon={<ImagePlus />} title="Nenhuma mídia ainda" text="As fotos guardadas na sua linha aparecem aqui." />
  return <section className="timeline-gallery" aria-label={`${items.length} ${items.length === 1 ? 'foto' : 'fotos'} na sua linha`}>{items.map((item) => {
    const entry = entries.find((candidate) => candidate.id === item.entryId)
    return <button key={item.id} onClick={() => onOpen(item.id)} aria-label={`Ampliar foto ${item.position} de ${item.totalInEntry} do registro de ${formatLongDate(item.occurredAt)}`}><TimelineImage source={item.source} alt={entry?.text ? `Foto: ${entry.text}` : 'Foto pessoal sem descrição'} /></button>
  })}</section>
}

function TimelineMediaViewer({ items, entries, activeId, onClose }: { items: ReturnType<typeof timelineMedia>; entries: TimelineEntry[]; activeId?: string; onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((item) => item.id === activeId)))
  const closeButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!activeId) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => closeButton.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1))
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(items.length - 1, value + 1))
      if (event.key !== 'Tab') return
      const dialog = closeButton.current?.closest('[role="dialog"]')
      const focusable = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1) ?? first
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [activeId, items.length, onClose])

  if (!activeId || items.length === 0) return null
  const current = items[index] ?? items[0]
  const entry = entries.find((candidate) => candidate.id === current.entryId)
  return <div className="media-viewer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="media-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <header><div><p className="eyebrow">{formatLongDate(current.occurredAt)}</p><h2 id={titleId}>foto em destaque</h2></div><button ref={closeButton} className="icon-button" aria-label="Fechar foto" onClick={onClose}><X /></button></header>
    <div className="media-viewer-photo"><TimelineImage source={current.source} alt={entry?.text ? `Foto: ${entry.text}` : 'Foto pessoal sem descrição'} /></div>
    <footer><button type="button" aria-label="Foto anterior" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}><ChevronLeft /></button><span aria-live="polite">{index + 1} de {items.length}</span><button type="button" aria-label="Próxima foto" disabled={index === items.length - 1} onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}><ChevronRight /></button></footer>
  </section></div>
}

function TimelineDetailDialog({ entry, workout, loadUnit, onClose }: { entry?: TimelineEntry; workout?: Workout; loadUnit: Profile['loadUnit']; onClose: () => void }) {
  const titleId = useId()
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!entry) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => closeButton.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const dialog = closeButton.current?.closest('[role="dialog"]')
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1) ?? first
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [entry?.id])
  if (!entry) return null
  const images = timelineImages(entry)
  const kindLabel = entry.kind === 'workout' ? 'treino' : images.length > 0 ? `${images.length} ${images.length === 1 ? 'foto' : 'fotos'}` : 'nota'
  return <div className="detail-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="timeline-detail-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}><header><div><p className="eyebrow">{kindLabel} · {formatLongDate(entry.occurredAt)} · {formatTime(entry.occurredAt)}</p><h2 id={titleId}>{entry.title}</h2></div><button ref={closeButton} className="icon-button" aria-label="Fechar detalhes" onClick={onClose}><X /></button></header>{entry.isMilestone && <p className="milestone-label"><Star size={14} fill="currentColor" /> meu marco</p>}{entry.text && <p className="timeline-detail-text">{entry.text}</p>}{images.length > 0 && <TimelineRecordMedia key={entry.id} images={images} text={entry.text} />}{workout && <div className="timeline-workout-detail"><p className="timeline-workout-summary">{workoutDurationMinutes(workout)} min · {workout.items.length} {workout.items.length === 1 ? 'atividade' : 'atividades'}{workout.feeling ? ` · ${workout.feeling}` : ''}</p>{workout.items.map((item) => <section key={item.id}><h3>{item.exerciseName}</h3><p>{item.sets.filter((set) => set.completed).map((set) => formatSetSummary(set, item.metrics ?? defaultMetricsForMode(item.metricMode), loadUnit)).join(' · ') || 'Sem registros concluídos'}</p>{item.note && <small>{item.note}</small>}</section>)}</div>}</section></div>
}

function ExercisesPage({ data, refresh, setNotice, allExercises, allTemplates }: SharedProps) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('Todos')
  const [creating, setCreating] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [librarySection, setLibrarySection] = useState<'exercises' | 'templates'>('exercises')
  const filtered = allExercises.filter((exercise) => (group === 'Todos' || exercise.group === group) && `${exercise.name} ${exercise.aliases.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const toggleFavorite = async (id: string) => {
    if (data.favorites.includes(id)) await db.favorites.delete(id); else await db.favorites.put({ exerciseId: id })
    await refresh()
  }
  useEffect(() => {
    if (!creating && !creatingTemplate) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.bottom-sheet .icon-button')?.focus())
    return () => { window.cancelAnimationFrame(focusFrame); document.body.style.overflow = previous }
  }, [creating, creatingTemplate])
  return (
    <div className="page exercises-page">
      <PageHeader eyebrow="para consultar e preparar" title="biblioteca" />
      <div className="library-tabs" role="tablist" aria-label="Conteúdo da biblioteca"><button role="tab" aria-selected={librarySection === 'exercises'} className={librarySection === 'exercises' ? 'selected' : ''} onClick={() => setLibrarySection('exercises')}>exercícios <small>{allExercises.length}</small></button><button role="tab" aria-selected={librarySection === 'templates'} className={librarySection === 'templates' ? 'selected' : ''} onClick={() => setLibrarySection('templates')}>modelos <small>{allTemplates.length}</small></button></div>
      {librarySection === 'exercises' ? <>
        <label className="search-field prominent"><Search size={19} /><input placeholder="buscar pelo nome" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="filter-row scrollable">{exerciseGroups.map((value) => <button key={value} className={group === value ? 'selected' : ''} onClick={() => setGroup(value)}>{value.toLocaleLowerCase()}</button>)}</div>
        <p className="result-count">{filtered.length} {filtered.length === 1 ? 'exercício' : 'exercícios'}</p>
        <div className="exercise-list">{filtered.map((exercise) => <div className="exercise-list-row" key={exercise.id}><NavLink to={`/exercicios/${exercise.id}`}><ExerciseVisual visual={exercise.visual} label={exercise.name} compact /><span><strong>{exercise.name}</strong><small>{exercise.group} · {exercise.equipment}{exercise.origin === 'custom' ? ' · pessoal' : ''}</small></span></NavLink><button className="icon-button small" aria-label={data.favorites.includes(exercise.id) ? `Desfavoritar ${exercise.name}` : `Favoritar ${exercise.name}`} onClick={() => void toggleFavorite(exercise.id)}><Heart size={19} fill={data.favorites.includes(exercise.id) ? 'currentColor' : 'none'} /></button></div>)}</div>
      </> : <div className="template-library"><p className="library-note">Modelos apenas preparam o treino. Você pode trocar ou remover qualquer exercício.</p>{allTemplates.map((template) => <article className="template-row" key={template.id}><span className="template-thread" /><div><p>{template.origin === 'custom' ? 'modelo pessoal' : 'modelo do app'}</p><h2>{template.name}</h2><small>{template.note}</small><div className="template-exercises">{template.exerciseIds.slice(0, 4).map((id) => <span key={id}>{allExercises.find((exercise) => exercise.id === id)?.name ?? 'Exercício removido'}</span>)}{template.exerciseIds.length > 4 && <span>+{template.exerciseIds.length - 4}</span>}</div></div></article>)}</div>}
      <FloatingAddButton tone="blue" label={librarySection === 'exercises' ? 'Criar exercício pessoal' : 'Criar modelo de treino'} onClick={() => librarySection === 'exercises' ? setCreating(true) : setCreatingTemplate(true)} />
      {creating && <CustomExerciseSheet onClose={() => setCreating(false)} onSaved={async () => { await refresh(); setCreating(false); setNotice('Exercício pessoal criado.') }} />}
      {creatingTemplate && <TemplateSheet exercises={allExercises} onClose={() => setCreatingTemplate(false)} onSaved={async () => { await refresh(); setCreatingTemplate(false); setNotice('Modelo pessoal criado.') }} />}
    </div>
  )
}

function CustomExerciseSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('Pernas')
  const [category, setCategory] = useState<ActivityCategory>('strength')
  const [metricMode, setMetricMode] = useState<MetricMode>('load-reps')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!name.trim()) return
    await db.customExercises.put({ id: `custom-${makeId()}`, name: name.trim(), aliases: [], group, equipment: 'Personalizado', instructions: ['Registre aqui as observações que funcionam para você.'], origin: 'custom', category, metricMode, visual: category === 'strength' ? 'flow' : 'walk' }); await onSaved()
  }
  return <div className="sheet-backdrop"><form className="bottom-sheet" onSubmit={(event) => void submit(event)}>
    <div className="sheet-handle" />
    <header><h2>novo exercício</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X /></button></header>
    <label className="field"><span>nome</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="ex.: passada no step" /></label>
    <label className="field"><span>tipo</span><select value={category} onChange={(event) => { const next = event.target.value as ActivityCategory; setCategory(next); setMetricMode(next === 'strength' ? 'load-reps' : 'time-only') }}><option value="strength">Musculação</option><option value="cardio">Cardio</option><option value="other">Outra atividade</option></select></label>
    <label className="field"><span>como registrar</span><select value={metricMode} onChange={(event) => setMetricMode(event.target.value as MetricMode)}>{category === 'strength' ? <><option value="load-reps">Carga e repetições</option><option value="reps-only">Somente repetições</option><option value="time-only">Somente tempo</option></> : <><option value="distance-time">Distância e tempo</option><option value="time-only">Somente tempo</option></>}</select></label>
    <label className="field"><span>grupo principal</span><select value={group} onChange={(event) => setGroup(event.target.value)}>{exerciseGroups.filter((value) => value !== 'Todos').map((value) => <option key={value}>{value}</option>)}</select></label>
    <button className="primary-button wide" disabled={!name.trim()}>criar exercício</button>
  </form></div>
}

function TemplateSheet({ exercises, onClose, onSaved }: { exercises: Exercise[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const available = exercises.filter((exercise) => exercise.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 30)
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!name.trim() || selected.length === 0) return
    await db.customTemplates.put({ id: `template-custom-${makeId()}`, name: name.trim(), note: `${selected.length} ${selected.length === 1 ? 'exercício' : 'exercícios'} · pessoal`, exerciseIds: selected, origin: 'custom' }); await onSaved()
  }
  return <div className="sheet-backdrop"><form className="bottom-sheet template-sheet" onSubmit={(event) => void submit(event)}>
    <div className="sheet-handle" />
    <header><h2>novo modelo</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X /></button></header>
    <label className="field"><span>nome do modelo</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="ex.: pernas de terça" /></label>
    <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="buscar para adicionar" /></label>
    <p className="selection-count">{selected.length} selecionado{selected.length === 1 ? '' : 's'}</p>
    <div className="template-pick-list">{available.map((exercise) => <label key={exercise.id}><input type="checkbox" checked={selected.includes(exercise.id)} onChange={() => toggle(exercise.id)} /><ExerciseVisual visual={exercise.visual} label={exercise.name} compact /><span>{exercise.name}</span><Check size={17} /></label>)}</div>
    <button className="primary-button wide" disabled={!name.trim() || selected.length === 0}>guardar modelo</button>
  </form></div>
}

function ExerciseDetail({ allExercises, data, refresh }: { allExercises: Exercise[]; data: AppSnapshot; refresh: () => Promise<void> }) {
  const { id } = useParams(); const navigate = useNavigate(); const exercise = allExercises.find((item) => item.id === id)
  if (!exercise) return <SimpleEmpty icon={<BookOpen />} title="Exercício não encontrado" />
  const favorite = data.favorites.includes(exercise.id)
  return <div className="page detail-page"><header className="detail-top"><button className="icon-button" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft /></button><button className="icon-button soft" aria-label={favorite ? 'Desfavoritar' : 'Favoritar'} onClick={async () => { if (favorite) await db.favorites.delete(exercise.id); else await db.favorites.put({ exerciseId: exercise.id }); await refresh() }}><Heart fill={favorite ? 'currentColor' : 'none'} /></button></header><p className="eyebrow">{exercise.group} · {exercise.equipment}</p><h1>{exercise.name}</h1><div className="detail-illustration"><ExerciseVisual visual={exercise.visual} label={exercise.name} /><small>movimento resumido</small></div><section><p className="eyebrow">um passo de cada vez</p><ol className="instruction-list">{exercise.instructions.map((instruction, index) => <li key={instruction}><span>{index + 1}</span><p>{instruction}</p></li>)}</ol></section><aside className="care-note"><Info size={18} /><p>A ilustração ajuda a reconhecer o movimento, mas não demonstra todos os ajustes. Estas dicas não substituem orientação profissional.</p></aside></div>
}

function EvolutionPage({ data, allExercises }: { data: AppSnapshot; allExercises: Exercise[] }) {
  const completed = data.workouts.filter((workout) => workout.status === 'completed')
  const usedExercises = Array.from(new Set(completed.flatMap((workout) => workout.items.map((item) => item.exerciseId))))
  const [selected, setSelected] = useState(usedExercises[0] ?? '')
  const points = exerciseProgress(data.workouts, selected)
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const selectedName = allExercises.find((exercise) => exercise.id === selected)?.name
  return <div className="page evolution-page"><PageHeader eyebrow="sem pressa" title="evolução" /><section className="month-summary"><p>neste mês</p><strong>{thisMonthCount(data.workouts)}</strong><span>treinos que você guardou</span><i /></section><div className="stat-strip"><div><strong>{completed.length}</strong><span>treinos no total</span></div><div><strong>{totalCompletedSets(data.workouts)}</strong><span>registros concluídos</span></div></div><section className="progress-section"><div className="section-heading"><div><p className="eyebrow">carga por sessão</p><h2>um exercício</h2></div></div>{usedExercises.length === 0 ? <div className="empty-gentle"><BarChart3 size={22} /><p>Registre alguns treinos para enxergar mudanças por aqui.</p></div> : <><label className="field compact"><span>exercício</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{usedExercises.map((id) => <option key={id} value={id}>{allExercises.find((exercise) => exercise.id === id)?.name ?? id}</option>)}</select></label>{points.length === 0 ? <p className="chart-summary">Ainda não há cargas concluídas para este exercício.</p> : <><div className="mini-chart" role="img" aria-label={`Evolução da carga em ${selectedName}: ${points.map((point) => `${point.value} ${data.profile.loadUnit} em ${formatDay(point.date)}`).join(', ')}`}><span className="chart-max">{maxValue} {data.profile.loadUnit}</span><div className="chart-bars">{points.slice(-8).map((point) => <div key={point.date} style={{ height: `${Math.max(12, point.value / maxValue * 100)}%` }}><span>{point.value}</span></div>)}</div></div><p className="chart-summary">Maior carga registrada em {selectedName}: <strong>{maxValue} {data.profile.loadUnit}</strong>.</p></>}</>}</section><p className="little-note"><span>✦</span> evolução também é voltar, ajustar e continuar</p></div>
}

function ProfilePage({ data, refresh, setNotice, installExperience }: SharedProps) {
  const { user, signOutAccount, deleteAccount } = useAuth()
  const [profile, setLocalProfile] = useState(data.profile)
  const [pendingBackup, setPendingBackup] = useState<{ data: AppSnapshot }>()
  const [eraseConfirm, setEraseConfirm] = useState(false)
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState(false)
  const [dataActionBusy, setDataActionBusy] = useState(false)
  const [installActionBusy, setInstallActionBusy] = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const persistProfile = async (next: Profile) => { setLocalProfile(next); await saveProfile(next); await refresh() }
  const displayWeight = profile.bodyWeightKg === undefined ? undefined : profile.loadUnit === 'kg' ? profile.bodyWeightKg : kgToLb(profile.bodyWeightKg)
  const bmi = calculateBmi(profile.bodyWeightKg, profile.heightCm)
  const exportData = async () => {
    const backup = { app: BACKUP_APP_ID, schemaVersion: 3, exportedAt: new Date().toISOString(), data }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `brabita-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Backup baixado.')
  }
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const backup = JSON.parse(await file.text()) as { app?: string; schemaVersion?: number; data?: AppSnapshot }
      if (!backup.app || !ACCEPTED_BACKUP_APP_IDS.has(backup.app) || ![1, 2, 3].includes(backup.schemaVersion ?? 0) || !backup.data) throw new Error('invalid')
      setPendingBackup({ data: backup.data })
    } catch {
      setNotice('Este arquivo não é um backup válido.')
    } finally {
      event.target.value = ''
    }
  }
  const restoreBackup = async () => {
    if (!pendingBackup) return
    setDataActionBusy(true)
    const importedWorkouts = pendingBackup.data.workouts.map(normalizeWorkout)
    const importedExercises = pendingBackup.data.customExercises.map(normalizeCustomExercise)
    await clearAllData()
    await db.transaction('rw', [db.workouts, db.timeline, db.favorites, db.customExercises, db.customTemplates, db.profiles], async () => {
      await db.workouts.bulkPut(importedWorkouts)
      await db.timeline.bulkPut(pendingBackup.data.timeline)
      await db.favorites.bulkPut(pendingBackup.data.favorites.map((exerciseId) => ({ exerciseId })))
      await db.customExercises.bulkPut(importedExercises)
      await db.customTemplates.bulkPut(pendingBackup.data.customTemplates ?? [])
      await db.profiles.put({ ...defaultProfile, ...pendingBackup.data.profile })
    })
    setPendingBackup(undefined)
    setDataActionBusy(false)
    await refresh()
    setNotice('Backup restaurado.')
  }
  const erase = async () => {
    setDataActionBusy(true)
    await clearAllData()
    await saveProfile({ ...defaultProfile, onboarded: true })
    setEraseConfirm(false)
    setDataActionBusy(false)
    await refresh()
    setNotice('Dados apagados deste aparelho.')
  }
  const requestInstall = async () => {
    setInstallActionBusy(true)
    const result = await installExperience.requestInstall()
    setInstallActionBusy(false)
    if (result === 'instructions') {
      setInstallHelpOpen(true)
      return
    }
    setInstallHelpOpen(false)
    if (result === 'accepted') setNotice('Instalação autorizada. O ícone deve aparecer em instantes.')
    if (result === 'dismissed') setNotice('Instalação cancelada. Você pode tentar novamente por aqui.')
    if (result === 'installed') setNotice('A Brabita já está instalada neste aparelho.')
  }
  const installSteps = getManualInstallSteps(installExperience.platform)
  return <>
    <div className="page profile-page">
      <PageHeader eyebrow="seu espaço" title="eu" />
      <section className="profile-intro">
        <div className="avatar-soft"><UserRound /></div>
        <label><span>como quer ser chamada?</span><input value={profile.nickname} placeholder="seu apelido" onBlur={() => void persistProfile(profile)} onChange={(event) => setLocalProfile({ ...profile, nickname: event.target.value })} /></label>
      </section>
      <section className="settings-section">
        <h2>preferências</h2>
        <div className="setting-row"><span><strong>unidade de carga</strong><small>usada nos próximos registros</small></span><div className="segmented small"><button className={profile.loadUnit === 'kg' ? 'selected' : ''} onClick={() => void persistProfile({ ...profile, loadUnit: 'kg' })}>kg</button><button className={profile.loadUnit === 'lb' ? 'selected' : ''} onClick={() => void persistProfile({ ...profile, loadUnit: 'lb' })}>lb</button></div></div>
        <div className="setting-row"><span><strong>peso na linha</strong><small>permite registros de peso corporal</small></span><button className={profile.bodyWeightEnabled ? 'switch on' : 'switch'} role="switch" aria-label="Permitir peso corporal na linha" aria-checked={profile.bodyWeightEnabled} onClick={() => void persistProfile({ ...profile, bodyWeightEnabled: !profile.bodyWeightEnabled })}><i /></button></div>
      </section>
      <details className="health-details">
        <summary><span><strong>corpo e contexto de saúde</strong><small>tudo opcional</small></span><ChevronRight size={19} /></summary>
        <div className="health-fields">
          <p className="sensitive-note"><Info size={16} /> Estes dados ficam no aparelho e ainda não mudam sugestões do app.</p>
          <div className="profile-number-grid"><label><span>peso ({profile.loadUnit})</span><LocalizedNumberInput value={displayWeight} label={`Peso corporal em ${profile.loadUnit}`} onCommit={(value) => void persistProfile({ ...profile, bodyWeightKg: value === undefined ? undefined : profile.loadUnit === 'kg' ? value : lbToKg(value) })} /></label><label><span>altura (cm)</span><LocalizedNumberInput value={profile.heightCm} label="Altura em centímetros" onCommit={(value) => void persistProfile({ ...profile, heightCm: value })} /></label></div>
          <div className="setting-row"><span><strong>mostrar IMC</strong><small>calculado só com peso e altura</small></span><button className={profile.showBmi ? 'switch on' : 'switch'} role="switch" aria-label="Mostrar IMC" aria-checked={Boolean(profile.showBmi)} onClick={() => void persistProfile({ ...profile, showBmi: !profile.showBmi })}><i /></button></div>
          {profile.showBmi && <div className="bmi-line"><span>IMC</span><strong>{bmi === undefined ? 'preencha peso e altura' : formatLocalizedNumber(bmi)}</strong><small>Informativo, sem classificação ou diagnóstico.</small></div>}
          <label className="profile-number-field"><span>duração média do ciclo (dias)</span><LocalizedNumberInput value={profile.menstrualCycleDays} label="Duração média do ciclo menstrual em dias" onCommit={(value) => void persistProfile({ ...profile, menstrualCycleDays: value })} /></label>
          <label className="field"><span>gravidez</span><select value={profile.pregnancyStatus ?? ''} onChange={(event) => void persistProfile({ ...profile, pregnancyStatus: event.target.value ? event.target.value as Profile['pregnancyStatus'] : undefined })}><option value="">Prefiro não informar</option><option value="pregnant">Estou grávida</option><option value="not-pregnant">Não estou grávida</option></select></label>
        </div>
      </details>
      <section className="device-section">
        <p className="eyebrow">neste dispositivo</p><h2>abrir como aplicativo</h2>
        <p>Instalada, a Brabita ganha ícone próprio e continua pronta para os treinos já carregados mesmo sem conexão.</p>
        {installExperience.installed ? <div className="install-device-row installed"><span className="install-device-icon"><Check size={19} /></span><span><strong>Brabita instalada</strong><small>você já está usando a versão em aplicativo</small></span></div> : <button className="data-action" disabled={installActionBusy} onClick={() => void requestInstall()}><Smartphone /><span><strong>{installExperience.promptAvailable ? 'instalar Brabita' : 'como instalar a Brabita'}</strong><small>{installExperience.promptAvailable ? 'abre a confirmação segura do navegador' : 'opção manual para este navegador'}</small></span><ChevronRight /></button>}
        {!installExperience.installed && installHelpOpen && <div className="manual-install-help" role="status"><strong>instalação pelo navegador</strong><ol>{installSteps.map((step) => <li key={step}>{step}</li>)}</ol><p>O navegador sempre pede sua confirmação; nenhum site consegue instalar um aplicativo sem ela.</p><button type="button" onClick={() => setInstallHelpOpen(false)}>entendi</button></div>}
      </section>
      <section className="account-section">
        <p className="eyebrow">sua conta</p><h2>acesso ao diário</h2>
        <div className="account-summary"><ShieldCheck size={21} /><span><strong>{user?.displayName || profile.nickname || 'Sua conta Brabita'}</strong><small>{user?.email ?? 'Conta conectada'} · e-mail confirmado</small></span></div>
        <button className="data-action" onClick={() => void signOutAccount()}><LogOut /><span><strong>sair desta conta</strong><small>seus dados permanecem guardados neste aparelho</small></span><ChevronRight /></button>
        <button className="danger-action" onClick={() => setAccountDeleteConfirm(true)}><Trash2 size={18} /> excluir minha conta</button>
      </section>
      <section className="data-section">
        <p className="eyebrow">seus dados</p><h2>ficam neste aparelho</h2><p>Seu diário é separado pela conta conectada. Faça um backup para levar sua história com você ou recuperar depois.</p>
        <button className="data-action" onClick={() => void exportData()}><Download /><span><strong>baixar backup</strong><small>treinos, notas, fotos, modelos e preferências</small></span><ChevronRight /></button>
        <button className="data-action" onClick={() => fileRef.current?.click()}><Upload /><span><strong>restaurar backup</strong><small>substitui os dados deste aparelho</small></span><ChevronRight /></button>
        <input ref={fileRef} hidden type="file" accept="application/json" onChange={(event) => void importData(event)} />
        <button className="danger-action" onClick={() => setEraseConfirm(true)}><Trash2 size={18} /> apagar todos os dados</button>
      </section>
      <footer className="app-footer"><img className="brand-logo small" src={BRAND_ICON_URL} alt="" /><p><strong className="brand-name">Brabita</strong> · versão {CURRENT_RELEASE.version}</p></footer>
    </div>
    <ConfirmDialog open={Boolean(pendingBackup)} title="restaurar este backup?" confirmLabel="restaurar backup" onClose={() => setPendingBackup(undefined)} onConfirm={() => void restoreBackup()} busy={dataActionBusy}><p>Os dados atuais deste aparelho serão substituídos pelo conteúdo do arquivo.</p></ConfirmDialog>
    <ConfirmDialog open={eraseConfirm} title="apagar todos os dados?" confirmLabel="apagar tudo" tone="danger" onClose={() => setEraseConfirm(false)} onConfirm={() => void erase()} busy={dataActionBusy}><p>Treinos, fotos, notas, modelos e preferências serão removidos deste aparelho. Esta ação não pode ser desfeita.</p></ConfirmDialog>
    <ConfirmDialog open={accountDeleteConfirm} title="excluir sua conta?" confirmLabel="excluir conta" tone="danger" onClose={() => setAccountDeleteConfirm(false)} onConfirm={() => {
      setDataActionBusy(true)
      void deleteAccount().catch((error) => {
        setDataActionBusy(false)
        setAccountDeleteConfirm(false)
        setNotice(getAuthErrorMessage(error))
      })
    }} busy={dataActionBusy}><p>A conta e o diário dela neste aparelho serão excluídos. Esta ação não pode ser desfeita.</p></ConfirmDialog>
  </>
}

function AppUpdateScreen({ flow, onRetry }: { flow: UpdateFlow; onRetry: () => void }) {
  const complete = flow.phase === 'complete'
  const stalled = flow.phase === 'stalled'
  const version = complete ? CURRENT_RELEASE.version : flow.target?.version
  return <main className="app-update-screen" aria-live="polite" aria-busy={!complete && !stalled}>
    <img src={BRAND_ICON_URL} alt="" />
    {complete ? <span className="update-status-icon complete"><Check /></span> : stalled ? <span className="update-status-icon stalled"><RotateCcw /></span> : <span className="update-status-icon loading" />}
    <div>
      <p className="eyebrow">{complete ? 'tudo certo' : stalled ? 'a atualização pausou' : 'só um instante'}</p>
      <h1>{complete ? 'Diário atualizado.' : stalled ? 'Vamos tentar de novo?' : 'Atualizando seu diário…'}</h1>
      <p>{complete
        ? `A versão ${CURRENT_RELEASE.version} foi confirmada.`
        : stalled
          ? flow.message ?? 'A nova versão ainda não foi confirmada.'
          : version ? `Instalando a versão ${version}. Não feche o aplicativo.` : 'Instalando a nova versão. Não feche o aplicativo.'}</p>
    </div>
    {stalled && <button className="primary-button" onClick={onRetry}><RotateCcw size={18} /> tentar novamente</button>}
    {!complete && <small>Seus treinos e fotos permanecem guardados neste aparelho.</small>}
  </main>
}

function WorkoutDetail({ data }: { data: AppSnapshot }) {
  const { id } = useParams(); const navigate = useNavigate(); const workout = data.workouts.find((item) => item.id === id)
  if (!workout) return <SimpleEmpty icon={<Dumbbell />} title="Treino não encontrado" />
  return <div className="page detail-page"><header className="detail-top"><button className="icon-button" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft /></button></header><p className="eyebrow">{formatLongDate(workout.endedAt ?? workout.startedAt)}</p><h1>{workout.title}</h1><p className="lead compact">{workoutDurationMinutes(workout)} min · {workout.items.length} atividades{workout.feeling ? ` · ${workout.feeling}` : ''}</p><div className="workout-detail-list">{workout.items.map((item) => <section key={item.id}><h2>{item.exerciseName}</h2><p>{item.sets.filter((set) => set.completed).map((set) => formatSetSummary(set, item.metrics ?? defaultMetricsForMode(item.metricMode), data.profile.loadUnit)).join('  ·  ') || 'Sem registros concluídos'}</p>{item.note && <small>{item.note}</small>}</section>)}</div></div>
}

function BottomNav() {
  const items = [
    { to: '/', label: 'Hoje', icon: Home }, { to: '/linha', label: 'Linha', icon: TimelinePathIcon },
    { to: '/exercicios', label: 'Biblioteca', icon: BookOpen }, { to: '/evolucao', label: 'Evolução', icon: BarChart3 }, { to: '/eu', label: 'Eu', icon: UserRound },
  ]
  return <nav className="bottom-nav" aria-label="Navegação principal">{items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={21} /><span>{label}</span></NavLink>)}</nav>
}

function TimelinePathIcon({ size = 21 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 4.5h10a4 4 0 0 1 0 8h-5a3.5 3.5 0 0 0 0 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="4.5" cy="4.5" r="2.1" fill="currentColor" /><circle cx="10" cy="4.5" r="1.8" fill="var(--white)" stroke="currentColor" strokeWidth="1.5" /><circle cx="14.5" cy="12.5" r="1.8" fill="var(--white)" stroke="currentColor" strokeWidth="1.5" /><circle cx="9.5" cy="19.5" r="1.8" fill="var(--white)" stroke="currentColor" strokeWidth="1.5" /><circle cx="19.5" cy="19.5" r="2.1" fill="currentColor" /></svg>
}

function FloatingAddButton({ tone, label, onClick }: { tone: 'pink' | 'blue'; label: string; onClick: () => void }) {
  return <button className={`floating-add ${tone}`} aria-label={label} onClick={onClick}><Plus size={27} /></button>
}

function ConfirmDialog({ open, title, confirmLabel, tone = 'default', busy = false, onClose, onConfirm, children }: { open: boolean; title: string; confirmLabel: string; tone?: 'default' | 'danger'; busy?: boolean; onClose: () => void; onConfirm: () => void; children: ReactNode }) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, busy, onClose])
  if (!open) return null
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}><span className={`dialog-stroke ${tone}`} aria-hidden="true" /><h2 id={titleId}>{title}</h2><div className="dialog-copy">{children}</div><div className="dialog-actions"><button className="dialog-cancel" autoFocus disabled={busy} onClick={onClose}>voltar</button><button className={tone === 'danger' ? 'dialog-confirm danger' : 'dialog-confirm'} disabled={busy} onClick={onConfirm}>{busy ? 'aguarde…' : confirmLabel}</button></div></section></div>
}

function SimpleEmpty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return <section className="simple-empty"><div className="soft-orbit">{icon}</div><h2>{title}</h2>{text && <p>{text}</p>}{action}</section>
}

async function compressImage(file: File): Promise<string> {
  const source = URL.createObjectURL(file)
  try {
    try {
      const image = await createImageBitmap(file, { imageOrientation: 'from-image' })
      const result = await drawCompressedImage(image, image.width, image.height)
      image.close()
      return result
    } catch {
      try {
        const image = await ensureImageLoads(source)
        return await drawCompressedImage(image, image.naturalWidth, image.naturalHeight)
      } catch {
        if (!isLikelyHeic(file)) throw new Error('unsupported-image')
        return await compressHeicImage(file)
      }
    }
  } finally {
    URL.revokeObjectURL(source)
  }
}

async function compressHeicImage(file: File) {
  const { heicTo, isHeic } = await import('heic-to/csp')
  if (!await isHeic(file)) throw new Error('invalid-heic')
  const image = await heicTo({ blob: file, type: 'bitmap' })
  try {
    return await drawCompressedImage(image, image.width, image.height)
  } finally {
    image.close()
  }
}

async function drawCompressedImage(image: CanvasImageSource, width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error('invalid-image-size')
  const max = 1280
  const scale = Math.min(1, max / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')
  context.fillStyle = '#fffdf8'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const webp = await canvasToBlob(canvas, 'image/webp', .76)
  const blob = webp.type.toLocaleLowerCase() === 'image/webp'
    ? webp
    : await canvasToBlob(canvas, 'image/jpeg', .78)
  return readFileAsDataUrl(blob)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('empty-image')), type, quality)
  })
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
}

function ensureImageLoads(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve(image) : reject(new Error('empty-image'))
    image.onerror = () => reject(new Error('unsupported-image'))
    image.src = source
  })
}

function isSupportedImage(file: File) {
  const supportedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', 'image/x-heic', 'image/x-heif'].includes(file.type.toLocaleLowerCase())
  const supportedExtension = /\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name)
  return supportedMime || supportedExtension
}

function isLikelyHeic(file: File) {
  return ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', 'image/x-heic', 'image/x-heif'].includes(file.type.toLocaleLowerCase()) || /\.(heic|heif)$/i.test(file.name)
}

function formatSetSummary(set: WorkoutSet, metrics: WorkoutMetric[], unit: Profile['loadUnit']) {
  return metrics.map((metric) => {
    if (metric === 'load') return `${formatLocalizedNumber(set.load)} ${unit}`
    if (metric === 'reps') return `${formatLocalizedNumber(set.reps)} reps`
    if (metric === 'distance') return `${formatLocalizedNumber(set.distanceKm)} km`
    return `${formatLocalizedNumber(set.durationMinutes)} min`
  }).join(' · ')
}

function normalizeWorkout(workout: Workout): Workout {
  return {
    ...workout,
    restSeconds: workout.restSeconds ?? 90,
    items: workout.items.map((item) => {
      const known = systemExercises.find((exercise) => exercise.id === item.exerciseId)
      const metricMode = item.metricMode ?? known?.metricMode ?? 'load-reps'
      return { ...item, category: item.category ?? known?.category ?? 'strength', metricMode, metrics: item.metrics ?? defaultMetricsForMode(metricMode) }
    }),
  }
}

function normalizeCustomExercise(exercise: Exercise): Exercise {
  return { ...exercise, category: exercise.category ?? 'strength', metricMode: exercise.metricMode ?? 'load-reps', visual: exercise.visual ?? 'flow' }
}

export default App
