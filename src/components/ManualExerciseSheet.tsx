import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createManualExercise } from '../manual-exercises'
import { manualGroups, validateManualDraft, type ManualDraft } from '../manual-exercise-data'
import type { Exercise } from '../types'
import { defaultMetricsForMode, workoutMetricOrder } from '../domain'
import { PlatformSelect } from './PlatformSelect'
import { normalizeExerciseName, similarExercises } from '../exercise-similarity'
import { ExerciseArtwork } from './ExerciseVisual'

export function ManualExerciseSheet({ onClose, onSaved, onUseExisting, exercises, addToWorkout = false }: { onClose: () => void; onSaved: (exercise: Exercise) => Promise<void>; onUseExisting: (exercise: Exercise) => Promise<void>; exercises: Exercise[]; addToWorkout?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ManualDraft>({ name: '', equipment: '', category: 'strength', metricMode: 'load-reps', defaultMetrics: ['load', 'reps'], group: 'Corpo inteiro', description: '' })
  const [error, setError] = useState('')
  const [searchName, setSearchName] = useState('')
  const [rejected, setRejected] = useState<string[]>([])
  useEffect(() => { const timer = setTimeout(() => setSearchName(draft.name), 250); return () => clearTimeout(timer) }, [draft.name])
  const rejectionKey = (exercise: Exercise) => `${normalizeExerciseName(draft.name)}:${exercise.id}`
  const suggestions = similarExercises(searchName, exercises).filter(exercise => !rejected.includes(rejectionKey(exercise)))
  const suggested = normalizeExerciseName(searchName) === normalizeExerciseName(draft.name) ? suggestions[0] : undefined
  const useExisting = async (exercise: Exercise) => {
    if (submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try { await onUseExisting(exercise) } catch { setError('Não foi possível abrir este exercício. Tente novamente.') }
    finally { submitting.current = false; setBusy(false) }
  }
  const [busy, setBusy] = useState(false)
  const saved = useRef<Exercise | null>(null)
  const submitting = useRef(false)
  const [discard, setDiscard] = useState(false)
  const continueButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (discard) continueButton.current?.focus() }, [discard])
  useEffect(() => {
    const target = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    return () => { element.close(); if (target?.isConnected) target.focus() }
  }, [])
  const close = () => { if (discard) { setDiscard(false); return }; if (!busy) { if ((draft.name || draft.equipment || draft.description) && !saved.current) setDiscard(true); else onClose() } }
  const change = <K extends keyof ManualDraft>(key: K, value: ManualDraft[K]) => setDraft(current => ({ ...current, [key]: value }))
  const submit = async () => {
    if (submitting.current) return
    const validation = validateManualDraft(step === 0 ? { ...draft, defaultMetrics: undefined } : draft)
    if (validation) { setError(validation); return }
    if (step === 0 && similarExercises(draft.name, exercises).some(exercise => !rejected.includes(rejectionKey(exercise)))) { setSearchName(draft.name); setError('Confira a sugestão abaixo do nome antes de continuar.'); return }
    if (step < 2) { setStep(step + 1); setError(''); return }
    submitting.current = true; setBusy(true); setError('')
    try {
      saved.current ??= await createManualExercise(draft)
      await onSaved(saved.current)
    } catch (cause) { setError(saved.current ? 'Exercício criado. Tente novamente para continuar.' : cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} className="guide-dialog manual-exercise-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); close() }}>
    <header><div><small className="guide-eyebrow">{discard ? 'Antes de sair' : `Do seu jeito · ${step + 1} de 3`}</small><h2 id={id}>{discard ? 'Descartar cadastro?' : ['Novo exercício', 'Como registrar?', 'Tudo certo?'][step]}</h2></div><button className="icon-button" aria-label={discard ? 'Voltar ao cadastro' : 'Fechar cadastro'} onClick={close} disabled={busy}><X /></button></header>
    {discard ? <div className="manual-discard"><p>As informações preenchidas ainda não foram salvas.</p><div className="manual-discard-actions"><button ref={continueButton} className="primary-button wide" onClick={() => setDiscard(false)}>Continuar preenchendo</button><button className="manual-discard-button wide" onClick={onClose}>Descartar cadastro</button></div></div> : <form onSubmit={event => { event.preventDefault(); void submit() }}>
      <fieldset disabled={busy || Boolean(saved.current)}>
      {step === 0 && <>
        <label className="field"><span>Nome do exercício ou atividade</span><input autoFocus required minLength={2} maxLength={100} value={draft.name} placeholder="Ex.: passada no step" onChange={event => change('name', event.target.value)} /></label>
        {suggested && <section className="manual-similar" aria-label="Exercício parecido"><p>Será que é este?</p><div className="manual-similar-exercise"><ExerciseArtwork exercise={suggested} compact /><div><strong>{suggested.name}</strong><small>{suggested.group} · {suggested.equipment}</small></div></div><div className="manual-similar-actions"><button type="button" className="secondary-button" onClick={() => void useExisting(suggested)}>É esse</button><button type="button" className="manual-discard-button" onClick={() => { setRejected(current => [...current, rejectionKey(suggested)]); setError('') }}>Não é esse</button></div></section>}
        <PlatformSelect label="Modalidade" value={draft.category} options={[{ value: 'strength', label: 'Musculação' }, { value: 'cardio', label: 'Cardio' }, { value: 'other', label: 'Outra atividade' }]} onChange={value => { const category = value as ManualDraft['category']; setDraft(current => ({ ...current, category, group: category === 'strength' ? 'Corpo inteiro' : category === 'cardio' ? 'Cardio' : 'Outras', metricMode: category === 'strength' ? 'load-reps' : 'time-only', defaultMetrics: category === 'strength' ? ['load', 'reps'] : ['duration'] })) }} />
        <label className="field"><span>Equipamento <small>opcional</small></span><input maxLength={100} value={draft.equipment} placeholder="Ex.: halteres e step" onChange={event => change('equipment', event.target.value)} /></label>
      </>}
      {step === 1 && <>
        <fieldset className="manual-metric-options"><legend>Registros <small>padrão do exercício</small></legend>{workoutMetricOrder.map(metric => <label key={metric}><input type="checkbox" checked={(draft.defaultMetrics ?? defaultMetricsForMode(draft.metricMode)).includes(metric)} onChange={event => { const selected = draft.defaultMetrics ?? defaultMetricsForMode(draft.metricMode); change('defaultMetrics', event.target.checked ? [...selected, metric] : selected.filter(value => value !== metric)) }} /><span>{{ load: 'Carga', reps: 'Repetições', distance: 'Distância', duration: 'Tempo' }[metric]}</span></label>)}</fieldset>
        {draft.category === 'strength' && <PlatformSelect label="Região principal" hint="(sugestão)" value={draft.group} options={manualGroups.map(group => ({ value: group, label: group }))} onChange={value => change('group', value)} />}
        <label className="field"><span>Descrição breve <small>opcional</small></span><textarea maxLength={600} rows={3} value={draft.description} placeholder="Como reconhecer o movimento? Não inclua dados pessoais ou de saúde." onChange={event => change('description', event.target.value)} /></label>
      </>}
      {step === 2 && <><p><span className="manual-badge">Manual</span></p><h3>{draft.name}</h3><p>{draft.group} · {draft.equipment || 'Sem equipamento informado'}</p>{draft.description && <p>{draft.description}</p>}<p className="muted">Esta ficha será enviada à equipe Brabita para possível revisão. Não fica pública automaticamente. Seus treinos e dados pessoais não serão enviados junto.</p><p className="muted">Sem conexão? Você já pode usar o exercício; o envio será retomado depois.</p></>}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="manual-actions">{step > 0 && <button type="button" className="secondary-button" disabled={busy || Boolean(saved.current)} onClick={() => { setStep(step - 1); setError('') }}>Voltar</button>}<button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : step < 2 ? 'Continuar' : addToWorkout ? 'Criar e adicionar' : 'Criar exercício'}</button></div>
    </form>}
  </dialog>
}
