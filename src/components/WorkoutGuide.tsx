import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Pause, Plus, X } from 'lucide-react'
import { mutateActiveWorkout } from '../db'
import { recordingHint } from '../data/catalog-review'
import { defaultMetricsForMode, isSetValidForMetrics, parseLocalizedNumber, workoutMetricOrder } from '../domain'
import { adjustRest, advanceWorkout, completedItemSummary, copySetForNextSeries, itemFinished, recordGuidedSet, restTotal, settleRests } from '../workout-guide'
import type { LoadUnit, Workout, WorkoutItem, WorkoutMetric, WorkoutSet } from '../types'

const timer = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const keys = { load: 'load', reps: 'reps', distance: 'distanceKm', duration: 'durationMinutes' } as const
const labels = { load: 'Carga', reps: 'Repetições', distance: 'Distância (km)', duration: 'Tempo (min)' }
type Draft = { itemId: string; set: WorkoutSet; metrics: WorkoutMetric[]; values: Partial<Record<WorkoutMetric, string>> }

export function WorkoutGuide({ workout, unit, refresh, onFocus, onAdd, onFinish }: {
  workout: Workout; unit: LoadUnit; refresh: () => Promise<void>
  onFocus: (item: WorkoutItem) => void; onAdd: () => void; onFinish: () => Promise<void>
}) {
  const [mode, setMode] = useState<'record' | 'choice' | 'rest' | null>(null)
  const [draft, setDraft] = useState<Draft>()
  const [seconds, setSeconds] = useState(Math.min(180, Math.max(15, workout.restSeconds ?? 90)))
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const item = workout.items.find(row => row.id === workout.currentItemId) ?? workout.items[0]
  const draftItem = workout.items.find(row => row.id === draft?.itemId)
  const index = workout.items.findIndex(row => row.id === item?.id)
  const rest = workout.rests?.find(row => !row.endedAt)
  const remaining = rest ? Math.max(0, Math.ceil((Date.parse(rest.startedAt) + rest.plannedSeconds * 1000 - now) / 1000)) : 0
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não conseguimos salvar. Tente novamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  useEffect(() => {
    if (!rest) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [rest?.id])
  useEffect(() => {
    if (rest && remaining === 0) void run(async () => {
      await mutateActiveWorkout(workout.id, latest => settleRests(latest, Date.now()))
      await refresh()
    })
  }, [rest?.id, remaining])
  useEffect(() => {
    const element = dialog.current
    if (mode && element && !element.open) element.showModal()
    if (!mode && element?.open) element.close()
  }, [mode])
  const prepare = (selected: WorkoutItem, set: WorkoutSet): Draft => {
    const metrics = selected.metrics ?? defaultMetricsForMode(selected.metricMode)
    return { itemId: selected.id, set, metrics, values: Object.fromEntries(metrics.map(metric => [metric, set[keys[metric]]?.toString().replace('.', ',') ?? ''])) }
  }
  const next = () => void run(async () => {
    const latest = await mutateActiveWorkout(workout.id, row => settleRests(row, Date.now(), true))
    const selected = latest.items.find(row => row.id === item?.id) ?? latest.items[0]
    if (!selected) return
    const pending = selected.sets.find(set => !set.completed)
    if (!pending && selected.sets.length) { setMode('choice'); await refresh(); return }
    const set = pending ?? { id: crypto.randomUUID(), completed: false }
    const metrics = selected.metrics ?? defaultMetricsForMode(selected.metricMode)
    if (isSetValidForMetrics(set, metrics)) {
      await mutateActiveWorkout(workout.id, row => recordGuidedSet(row, selected.id, set, metrics, new Date().toISOString(), unit))
      setNow(Date.now()); setMode(null)
    } else { setDraft(previous => previous?.set.id === set.id ? previous : prepare(selected, set)); setMode('record') }
    await refresh()
  })
  const done = () => void run(async () => {
    if (!draft) return
    const set = { ...draft.set }
    for (const metric of draft.metrics) set[keys[metric]] = parseLocalizedNumber(draft.values[metric] ?? '')
    await mutateActiveWorkout(workout.id, row => recordGuidedSet(row, draft.itemId, set, draft.metrics, new Date().toISOString(), unit))
    setNow(Date.now()); await refresh(); setMode(null)
  })
  const anotherSet = () => void run(async () => {
    if (!item) return
    const latest = await mutateActiveWorkout(workout.id, row => ({ ...row, items: row.items.map(selected => selected.id !== item.id || selected.sets.some(set => !set.completed) ? selected : { ...selected, sets: [...selected.sets, copySetForNextSeries(selected.sets.at(-1))] }) }))
    const selected = latest.items.find(row => row.id === item.id)
    if (selected) onFocus(selected)
    await refresh(); setMode(null)
  })
  const advance = () => void run(async () => {
    if (!item) return
    let target: WorkoutItem | undefined
    let pendingDraft: Draft | undefined
    await mutateActiveWorkout(workout.id, row => {
      const selected = row.items.find(candidate => candidate.id === item.id)
      const pending = selected?.sets.find(set => !set.completed)
      if (selected && pending) { pendingDraft = prepare(selected, pending); return row }
      const ordered = advanceWorkout(row)
      target = ordered.items.find(candidate => !itemFinished(candidate))
      return ordered
    })
    if (pendingDraft) { setDraft(pendingDraft); setMode('record') }
    else { setMode(null); if (!target) onAdd() }
    if (target) onFocus(target)
    await refresh()
  })
  const startRest = () => void run(async () => {
    if (!item) return
    const startedAt = new Date().toISOString()
    await mutateActiveWorkout(workout.id, row => {
      const settled = settleRests(row, Date.now(), true)
      return { ...settled, restSeconds: seconds, rests: [...(settled.rests ?? []), { id: crypto.randomUUID(), itemId: item.id, exerciseName: item.exerciseName, setId: item.sets.filter(set => set.completed).at(-1)?.id, startedAt, plannedSeconds: seconds }] }
    })
    setNow(Date.now()); await refresh(); setMode(null)
  })
  const changeRest = (delta: -15 | 15) => void run(async () => {
    if (!rest) return
    await mutateActiveWorkout(workout.id, row => adjustRest(row, rest.id, delta, Date.now()))
    setNow(Date.now()); await refresh()
  })
  const endRest = () => void run(async () => {
    await mutateActiveWorkout(workout.id, row => settleRests(row, Date.now(), true))
    await refresh()
  })
  return <>
    <aside className={`workout-guide${rest ? ' is-resting' : ''}`} aria-label="Controles do treino">
      {workout.items.length > 0 && <nav className="workout-stepper" aria-label="Sequência do treino"><p>Sequência do treino</p><div>{workout.items.map((entry, position) => <button type="button" key={entry.id} disabled={busy} className={`${entry.id === item?.id ? 'current' : ''} ${itemFinished(entry) ? 'complete' : ''}`} title={entry.exerciseName} aria-label={`${position + 1}. ${entry.exerciseName}, ${itemFinished(entry) ? 'concluído' : 'pendente'}`} aria-current={entry.id === item?.id ? 'step' : undefined} onClick={() => onFocus(entry)}><span>{itemFinished(entry) ? <Check size={14} /> : position + 1}</span><small>{entry.exerciseName}</small></button>)}</div></nav>}
      {rest ? <>
        <div className="guide-rest-label" role="status"><Pause size={16} /> Em descanso</div>
        <div className="guide-rest-clock">
          <button disabled={busy || remaining === 0} aria-label="Diminuir descanso em 15 segundos" onClick={() => changeRest(-15)}>−15 s</button>
          <strong role="timer" aria-label="Tempo restante de descanso" aria-live="off">{timer(remaining)}</strong>
          <button disabled={busy || remaining >= 180 || remaining === 0} aria-label="Aumentar descanso em 15 segundos" onClick={() => changeRest(15)}>+15 s</button>
        </div>
        <p className="guide-rest-exercise">{rest.exerciseName}</p>
        <div className="guide-buttons guide-rest-action"><button disabled={busy} onClick={endRest}>Encerrar pausa</button></div>
      </> : !item ? <p className="guide-empty">Adicione pelo menos um exercício para começar</p> : <>
        <div className="guide-current"><small>Exercício {index + 1} de {workout.items.length}</small><strong>{item.exerciseName}</strong></div>
        <div className="guide-buttons"><button disabled={busy} onClick={() => { setError(''); setMode('rest') }}><Pause size={19} />{rest ? `Descanso ${timer(remaining)}` : 'Descanso'}</button><button disabled={busy} onClick={next}>Próximo <ArrowRight size={19} /></button></div>
      </>}
      {error && !mode && <p role="alert" className="guide-error">{error}</p>}
    </aside>
    <dialog ref={dialog} className="guide-dialog" aria-labelledby="guide-title" onCancel={event => { if (busy) event.preventDefault(); else setMode(null) }} onClose={() => setMode(null)}>
      <header><div><small className="guide-eyebrow">{mode === 'record' ? 'Um registro por vez' : mode === 'choice' ? 'No seu ritmo' : 'Tempo de respirar'}</small><h2 id="guide-title">{mode === 'record' ? 'Registre esta série' : mode === 'choice' ? 'Como seguimos?' : 'Sua pausa'}</h2></div><button className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => setMode(null)}><X /></button></header>
      {error && <p role="alert" className="guide-error">{error}</p>}
      {mode === 'record' && draft && <form onSubmit={event => { event.preventDefault(); done() }}>
        <p>{workout.items.find(row => row.id === draft.itemId)?.exerciseName}</p>
        {draftItem?.analysis && <p className="recording-hint">{recordingHint(draftItem.analysis)}</p>}
        <div className="guide-metrics" role="group" aria-label="Medidas para registrar">{workoutMetricOrder.map(metric => <button disabled={busy} type="button" key={metric} aria-pressed={draft.metrics.includes(metric)} onClick={() => setDraft(current => {
          if (!current) return current
          const metrics = current.metrics.includes(metric) ? current.metrics.filter(value => value !== metric) : workoutMetricOrder.filter(value => value === metric || current.metrics.includes(value))
          return metrics.length ? { ...current, metrics } : current
        })}>{({ load: 'Carga', reps: 'Reps', distance: 'Distância', duration: 'Tempo' })[metric]}{draft.metrics.includes(metric) && <Check size={12} />}</button>)}</div>
        <div className="guide-fields">{draft.metrics.map(metric => <label className="field" key={metric}><span>{metric === 'load' ? `Carga (${draft.set.loadUnit ?? unit})` : labels[metric]}</span><input disabled={busy} required inputMode="decimal" value={draft.values[metric] ?? ''} onChange={event => setDraft({ ...draft, values: { ...draft.values, [metric]: event.target.value } })} /></label>)}</div>
        <button className="primary-button wide" disabled={busy}><Check size={18} /> Feito</button>
      </form>}
      {mode === 'choice' && <><p className="guide-context">{item?.exerciseName}{item && <small>{completedItemSummary(item, unit)}<br />{timer(restTotal(workout, item.id))} de descanso</small>}</p><div className="guide-choices"><button disabled={busy} onClick={anotherSet}><Plus size={18} /><span>Nova série</span></button><button disabled={busy} onClick={advance}><ArrowRight size={18} /><span>Próximo exercício</span></button><button disabled={busy} onClick={() => void run(async () => { await onFinish(); setMode(null) })}><Check size={18} /><span>Finalizar treino</span></button></div></>}
      {mode === 'rest' && <>
        {rest && <><p role="status">Descanso em andamento: {timer(remaining)}</p><button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await mutateActiveWorkout(workout.id, row => settleRests(row, Date.now(), true)); await refresh(); setMode(null) })}>Encerrar descanso</button></>}
        <p>Quanto tempo de pausa?</p>
        <div className="guide-presets">{[15, 30, 60, 90, 120, 180].map(value => <button key={value} aria-pressed={seconds === value} onClick={() => setSeconds(value)}>{timer(value)}</button>)}</div>
        <button className="primary-button wide" disabled={busy} onClick={startRest}>{rest ? 'Reiniciar descanso' : 'Iniciar descanso'}</button>
      </>}
    </dialog>
  </>
}
